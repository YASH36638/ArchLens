import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import type { DashboardSummaryDto, JwtPayload } from '@archlens/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload | undefined): Promise<DashboardSummaryDto> {
    if (!user) throw new UnauthorizedException();
    return this.dashboard.getSummary(user.sub);
  }
}
