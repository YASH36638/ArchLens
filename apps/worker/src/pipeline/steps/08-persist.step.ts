import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Module as IrModule, Repo, Smell as IrSmell } from '@archlens/ir-schema';
import type { WorkerConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma.service';
import type { PipelineContext, ProgressReporter } from '../pipeline.types';
import { snapshotSourceFiles, type SnapshotFileRecord } from './snapshot-source';

/** Neon serverless/WebSocket drops long interactive txs — keep each write short. */
const FILE_CHUNK = 40;
const SMELL_CHUNK = 100;

@Injectable()
export class PersistStep {
  private readonly logger = new Logger(PersistStep.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<WorkerConfig, true>
  ) {}

  async run(ctx: PipelineContext, progress: ProgressReporter): Promise<void> {
    if (!ctx.ir) throw new Error('IR missing before persist');
    const ir = ctx.ir;
    const reportsDir = this.config.get('IR_REPORTS_DIR', { infer: true });
    await fs.mkdir(reportsDir, { recursive: true });
    const irBlobPath = path.join(reportsDir, `${ctx.input.scanId}.json`);
    await fs.writeFile(irBlobPath, JSON.stringify(ir, null, 2), 'utf8');
    ctx.irBlobPath = irBlobPath;

    let snapshot;
    try {
      snapshot = await snapshotSourceFiles(ir, ctx.repoPath, reportsDir, ctx.input.scanId);
      this.logger.log(`Snapshotted ${snapshot.files.size} source files to ${snapshot.sourceDir}`);
    } catch (err) {
      this.logger.warn(`Source snapshot failed: ${(err as Error).message}`);
      snapshot = { sourceDir: '', files: new Map<string, SnapshotFileRecord>() };
    }

    const counts = countIr(ir);
    let reportId: string | undefined;

    try {
      const report = await this.prisma.report.create({
        data: {
          scanId: ctx.input.scanId,
          repoId: ctx.input.repoId,
          irVersion: ir.ir_version,
          grade: ir.grade,
          overallScore: ir.scoreBreakdown.overall,
          complexityScore: ir.scoreBreakdown.complexity,
          duplicationScore: ir.scoreBreakdown.duplication,
          couplingScore: ir.scoreBreakdown.coupling,
          cohesionScore: ir.scoreBreakdown.cohesion,
          smellsScore: ir.scoreBreakdown.smells,
          modulesCount: counts.modules,
          filesCount: counts.files,
          classesCount: counts.classes,
          functionsCount: counts.functions,
          smellsCount: counts.smells,
          irBlobPath,
          sourceDirPath: snapshot.sourceDir || null,
        },
      });
      reportId = report.id;

      let filesDone = 0;
      for (const irModule of ir.modules) {
        const moduleRow = await this.prisma.module.create({
          data: {
            reportId: report.id,
            irModuleId: irModule.id,
            name: irModule.name,
            virtual: irModule.virtual,
            filesCount: irModule.files.length,
          },
        });

        for (const chunk of chunkArray(irModule.files, FILE_CHUNK)) {
          for (const irFile of chunk) {
            const snap = snapshot.files.get(irFile.id);
            const fileRow = await this.prisma.file.create({
              data: {
                reportId: report.id,
                moduleId: moduleRow.id,
                irFileId: irFile.id,
                path: irFile.path,
                language: irFile.language,
                loc: irFile.loc,
                sha256: snap?.sha256 ?? null,
                byteSize: snap?.byteSize ?? null,
                truncated: snap?.truncated ?? false,
              },
            });

            const fileSmells = collectFileSmells(irModule, irFile.id);
            for (const smellChunk of chunkArray(fileSmells, SMELL_CHUNK)) {
              if (smellChunk.length === 0) continue;
              await this.prisma.smell.createMany({
                data: smellChunk.map((s) => ({
                  reportId: report.id,
                  fileId: fileRow.id,
                  irSmellId: s.id,
                  kind: s.kind,
                  ruleId: s.ruleId,
                  severity: s.severity,
                  message: s.message,
                  filePath: s.file,
                  startLine: s.location?.startLine ?? null,
                  endLine: s.location?.endLine ?? null,
                })),
              });
            }

            filesDone += 1;
          }

          if (filesDone % 200 === 0 || filesDone === counts.files) {
            const pct = 10 + Math.floor((filesDone / Math.max(counts.files, 1)) * 85);
            await progress.step(
              '08-persist',
              Math.min(pct, 95),
              `persisted ${filesDone}/${counts.files} files`
            );
          }
        }
      }
    } catch (err) {
      if (reportId) {
        this.logger.warn(`Persist failed; deleting partial report ${reportId}`);
        await this.prisma.report.delete({ where: { id: reportId } }).catch(() => undefined);
      }
      throw err;
    }

    ctx.reportId = reportId;
    this.logger.log(`Persisted report ${reportId} for scan ${ctx.input.scanId}`);
    await progress.step('08-persist', 100, `report ${reportId} ready`);
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface IrCounts {
  modules: number;
  files: number;
  classes: number;
  functions: number;
  smells: number;
}

function countIr(ir: Repo): IrCounts {
  let files = 0;
  let classes = 0;
  let functions = 0;
  let smells = 0;
  const seenSmells = new Set<string>();
  const tally = (id: string): void => {
    if (!seenSmells.has(id)) {
      seenSmells.add(id);
      smells += 1;
    }
  };
  for (const m of ir.modules) {
    for (const f of m.files) {
      files += 1;
      classes += f.classes.length;
      functions += f.functions.length;
      for (const s of f.smells) tally(s.id);
      for (const fn of f.functions) for (const s of fn.smells) tally(s.id);
      for (const c of f.classes) {
        functions += c.methods.length;
        for (const s of c.smells) tally(s.id);
        for (const method of c.methods) for (const s of method.smells) tally(s.id);
      }
    }
  }
  return { modules: ir.modules.length, files, classes, functions, smells };
}

function collectFileSmells(mod: IrModule, irFileId: string): IrSmell[] {
  const file = mod.files.find((f) => f.id === irFileId);
  if (!file) return [];
  const seen = new Map<string, IrSmell>();
  const add = (s: IrSmell): void => {
    if (!seen.has(s.id)) seen.set(s.id, s);
  };
  for (const s of file.smells) add(s);
  for (const fn of file.functions) for (const s of fn.smells) add(s);
  for (const c of file.classes) {
    for (const s of c.smells) add(s);
    for (const m of c.methods) for (const s of m.smells) add(s);
  }
  return Array.from(seen.values());
}
