import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Edge, Module as IrModule } from '@archlens/ir-schema';
import type { ArchitectureDto, ModuleSummaryDto } from '@archlens/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { IrLoader } from '../reports/ir-loader';

@Injectable()
export class ArchitectureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irLoader: IrLoader
  ) {}

  async getArchitecture(userId: string, scanId: string): Promise<ArchitectureDto> {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      include: { repository: { select: { userId: true } }, report: true },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    if (scan.repository.userId !== userId) throw new ForbiddenException();
    if (!scan.report) throw new NotFoundException('Report not ready');

    const ir = await this.irLoader.load(scan.report.irBlobPath);
    const modules: ModuleSummaryDto[] = ir.modules.map((m) => toModuleSummary(m));
    const edges: Edge[] = ir.edges ?? [];
    const fileEdges: Edge[] = ir.fileEdges ?? [];
    const cycles: string[][] =
      ir.cycles?.map((c) => c.representativePath ?? [...c.nodes, c.nodes[0]!]) ?? [];

    return {
      reportId: scan.report.id,
      repoId: scan.report.repoId,
      modules,
      edges,
      fileEdges: fileEdges.length > 0 ? fileEdges : undefined,
      diagram: {
        format: 'mermaid',
        source: buildMermaidModuleGraph(ir.modules, edges),
      },
      cycles,
    };
  }
}

function toModuleSummary(mod: IrModule): ModuleSummaryDto {
  return {
    id: mod.id,
    name: mod.name,
    fileCount: mod.files.length,
    virtual: mod.virtual ?? false,
    filePaths: mod.files.map((file) => file.path),
  };
}

/** Mirrors packages/analyzers module-graph.builder — kept local to avoid a heavy dependency. */
function buildMermaidModuleGraph(modules: IrModule[], edges: Edge[]): string {
  const lines: string[] = ['graph LR'];
  const safeIds = new Map<string, string>();
  for (const mod of modules) {
    const safe = sanitizeId(mod.id);
    safeIds.set(mod.id, safe);
    lines.push(`  ${safe}["${escapeLabel(mod.name)}"]`);
  }
  for (const edge of edges) {
    const from = safeIds.get(edge.from);
    const to = safeIds.get(edge.to);
    if (!from || !to) continue;
    lines.push(`  ${from} -->|${edge.kind}| ${to}`);
  }
  return lines.join('\n');
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"');
}
