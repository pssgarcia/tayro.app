import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { CampaignsModule } from './modules/campaigns/presentation/campaigns.module';
import { ApplicationsModule } from './modules/applications/presentation/applications.module';
import { ContentModule } from './modules/content/presentation/content.module';
import { RewardsModule } from './modules/rewards/presentation/rewards.module';
import { PartnershipResultsModule } from './modules/partnerships/presentation/partnership-results.module';
import { CreatorsModule } from './modules/creators/presentation/creators.module';
import { DashboardModule } from './modules/dashboard/presentation/dashboard.module';
import { BrandsModule } from './modules/brands/presentation/brands.module';

@Module({
  imports: [
    // Primeiro da lista — registra o HttpAdapterHost que o SentryGlobalFilter usa.
    SentryModule.forRoot(),

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
    PartnershipResultsModule,
    CreatorsModule,
    DashboardModule,
    BrandsModule,
  ],
  providers: [
    // Antes de qualquer outro filtro: reporta ao Sentry o que NÃO for
    // HttpException (Prisma não mapeado, TypeError, falha de infra) e delega
    // pro handler padrão do Nest — o cliente segue recebendo o 500 genérico,
    // sem stack. HttpException (4xx mapeado nos services) é fluxo de controle:
    // não vira evento, não há double-report.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },

    // Guard global de rate limiting. Sem ele, ThrottlerModule só configura — não
    // aplica. Endpoints de credenciais reforçam o limite via @Throttle.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
