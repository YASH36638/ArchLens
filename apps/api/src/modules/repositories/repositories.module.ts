import { Module } from '@nestjs/common';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { GithubMetaService } from './github-meta.service';

@Module({
  controllers: [RepositoriesController],
  providers: [RepositoriesService, GithubMetaService],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
