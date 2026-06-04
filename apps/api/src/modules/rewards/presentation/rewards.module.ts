import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { RewardsService } from '../application/rewards.service';
import { RewardsController } from './rewards.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  providers: [RewardsService, RolesGuard],
  controllers: [RewardsController],
})
export class RewardsModule {}
