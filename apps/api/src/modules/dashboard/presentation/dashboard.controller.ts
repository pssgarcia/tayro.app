import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from '../application/dashboard.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('brand')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Resumo agregado da marca (Brand)' })
  getDashboard(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getForBrand(user.id);
  }
}
