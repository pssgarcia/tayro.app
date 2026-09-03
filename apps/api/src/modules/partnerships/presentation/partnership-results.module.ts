import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { EmailModule } from '../../email/email.module';
import { PartnershipResultsService } from '../application/partnership-results.service';
import { PartnershipResultsController } from './partnership-results.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule, EmailModule],
  providers: [PartnershipResultsService, RolesGuard],
  controllers: [PartnershipResultsController],
})
export class PartnershipResultsModule {}
