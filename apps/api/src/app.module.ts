import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { CampaignsModule } from './modules/campaigns/presentation/campaigns.module';
import { ApplicationsModule } from './modules/applications/presentation/applications.module';
import { ContentModule } from './modules/content/presentation/content.module';
import { RewardsModule } from './modules/rewards/presentation/rewards.module';
import { CreatorsModule } from './modules/creators/presentation/creators.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),

    AuthModule,
    CampaignsModule,
    ApplicationsModule,
    ContentModule,
    RewardsModule,
    CreatorsModule,
  ],
  providers: [
    // Guard global de rate limiting. Sem ele, ThrottlerModule só configura — não
    // aplica. Endpoints de credenciais reforçam o limite via @Throttle.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
