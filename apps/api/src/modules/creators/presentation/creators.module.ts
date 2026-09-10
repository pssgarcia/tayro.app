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
  // AuthModule injeta CreatorsService pra expor DELETE /auth/delete-account —
  // a exclusão de conta precisa ficar em /auth/* (não /influencers/*) porque
  // o interceptor de 401 do frontend trata 401 fora de /auth/* como sessão
  // expirada e desloga; aqui o 401 é "senha atual incorreta", não token
  // expirado (mesmo motivo de changePassword/changeEmail viverem em auth).
  exports: [CreatorsService],
})
export class CreatorsModule {}
