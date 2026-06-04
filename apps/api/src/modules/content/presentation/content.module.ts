import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { ContentService } from '../application/content.service';
import { ContentController } from './content.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  providers: [ContentService, RolesGuard],
  controllers: [ContentController],
})
export class ContentModule {}
