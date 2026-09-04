import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../../shared/infrastructure/database/database.module';
import { InstagramModule } from '../../instagram/instagram.module';
import { EmailModule } from '../../email/email.module';
import { CreatorsModule } from '../../creators/presentation/creators.module';
import { AuthService } from '../application/auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from '../infrastructure/strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from '../infrastructure/strategies/jwt-refresh.strategy';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({}),
    InstagramModule,
    EmailModule,
    CreatorsModule,
  ],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
