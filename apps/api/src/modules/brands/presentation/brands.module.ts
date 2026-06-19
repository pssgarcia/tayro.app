import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { BrandsService } from '../application/brands.service';
import { BrandsController } from './brands.controller';
import { RolesGuard } from '../../../shared/guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  providers: [BrandsService, RolesGuard],
  controllers: [BrandsController],
})
export class BrandsModule {}
