import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { CampaignsService } from '../application/campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  providers: [CampaignsService, RolesGuard],
  controllers: [CampaignsController],
})
export class CampaignsModule {}
