import { Module } from '@nestjs/common';
import { ArchitectureController } from './architecture.controller';
import { ArchitectureService } from './architecture.service';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [ReportsModule],
  controllers: [ArchitectureController],
  providers: [ArchitectureService],
})
export class ArchitectureModule {}
