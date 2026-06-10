import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { InstagramModule } from '../../instagram/instagram.module';
import { ApplicationsService } from '../application/applications.service';
import { ApplicationsController } from './applications.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule, InstagramModule],
  providers: [ApplicationsService, RolesGuard],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
