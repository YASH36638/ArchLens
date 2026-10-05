import { Controller, Get, Param, ParseUUIDPipe, UnauthorizedException } from '@nestjs/common';
import type { ArchitectureDto, JwtPayload } from '@archlens/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ArchitectureService } from './architecture.service';

@Controller('architecture')
export class ArchitectureController {
  constructor(private readonly architecture: ArchitectureService) {}

  @Get(':scanId')
  get(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('scanId', new ParseUUIDPipe()) scanId: string
  ): Promise<ArchitectureDto> {
    if (!user) throw new UnauthorizedException();
    return this.architecture.getArchitecture(user.sub, scanId);
  }
}
