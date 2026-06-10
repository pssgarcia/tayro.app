import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { InstagramModule } from '../../instagram/instagram.module';
import { CreatorsService } from '../application/creators.service';
import { CreatorsController } from './creators.controller';
import { ProgramsPublicController } from './programs-public.controller';

@Module({
  imports: [DatabaseModule, InstagramModule],
  providers: [CreatorsService],
  controllers: [CreatorsController, ProgramsPublicController],
})
export class CreatorsModule {}
