import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { ApplicationsService } from '../application/applications.service';
import { ApplicationsController } from './applications.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  providers: [ApplicationsService, RolesGuard],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
