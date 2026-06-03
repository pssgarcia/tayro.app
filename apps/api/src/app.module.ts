import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    // Environment variables — loaded globally before any module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — 60 requests per minute per IP by default
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Feature modules (added incrementally as we build)
    // AuthModule,
    // UsersModule,
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
