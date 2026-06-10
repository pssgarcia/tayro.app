import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
    // BrandsModule,
    // InfluencersModule,
    // CampaignsModule,
    // ApplicationsModule,
    // ContentModule,
    // RewardsModule,
    // NotificationsModule,
  ],
})
export class AppModule {}
