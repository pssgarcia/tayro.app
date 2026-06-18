import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { DashboardService } from '../application/dashboard.service';
import { DashboardController } from './dashboard.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  providers: [DashboardService, RolesGuard],
  controllers: [DashboardController],
})
export class DashboardModule {}
