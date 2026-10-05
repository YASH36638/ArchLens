import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { simpleGit } from 'simple-git';
import type { PipelineContext, ProgressReporter } from '../pipeline.types';

@Injectable()
export class CloneStep {
  private readonly logger = new Logger(CloneStep.name);

  async run(ctx: PipelineContext, progress: ProgressReporter): Promise<void> {
    await progress.step('01-clone', 5, `cloning ${ctx.input.cloneUrl}`);

    await fs.mkdir(ctx.workdir, { recursive: true });
    const target = path.join(ctx.workdir, 'src');
    await fs.rm(target, { recursive: true, force: true });

    const git = simpleGit();
    const baseArgs: string[] = [];
    if (isRemoteUrl(ctx.input.cloneUrl)) baseArgs.push('--depth', '1');

    this.logger.log(`Cloning ${ctx.input.cloneUrl} -> ${target}`);
    try {
      const args = [...baseArgs];
      if (ctx.input.ref) args.push('--branch', ctx.input.ref);
      await git.clone(ctx.input.cloneUrl, target, args);
    } catch (err) {
      // Many older repos still default to `master` while Archlens defaults to `main`.
      // Retry without --branch so git checks out the remote HEAD.
      if (ctx.input.ref && isMissingRemoteBranchError(err)) {
        this.logger.warn(
          `Branch '${ctx.input.ref}' not found; recloning default remote HEAD for ${ctx.input.cloneUrl}`
        );
        await fs.rm(target, { recursive: true, force: true });
        await git.clone(ctx.input.cloneUrl, target, baseArgs);
      } else {
        throw err;
      }
    }

    ctx.repoPath = target;
    await progress.step('01-clone', 10, `cloned to ${target}`);
  }
}

function isRemoteUrl(url: string): boolean {
  return /^(https?|ssh|git\+ssh|git):\/\//.test(url) || url.startsWith('git@');
}

function isMissingRemoteBranchError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Remote branch .+ not found in upstream origin/i.test(msg) || /not found in upstream/i.test(msg)
  );
}
