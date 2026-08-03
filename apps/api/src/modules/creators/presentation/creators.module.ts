import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { InstagramModule } from '../../instagram/instagram.module';
import { EmailModule } from '../../email/email.module';
import { CreatorsService } from '../application/creators.service';
import { CreatorsController } from './creators.controller';
import { ProgramsPublicController } from './programs-public.controller';
import { InfluencersController } from './influencers.controller';

@Module({
  imports: [DatabaseModule, InstagramModule, EmailModule],
  providers: [CreatorsService],
  controllers: [
    CreatorsController,
    ProgramsPublicController,
    InfluencersController,
  ],
})
export class CreatorsModule {}
