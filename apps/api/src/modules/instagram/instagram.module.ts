import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';
import { INSTAGRAM_PROVIDER } from './instagram.constants';
import { InstagramSyncService } from './instagram-sync.service';
import { StubInstagramProvider } from './providers/stub.instagram.provider';
import { RapidApiInstagramProvider } from './providers/rapidapi.instagram.provider';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: INSTAGRAM_PROVIDER,
      useFactory: (config: ConfigService) => {
        const type = config.get<string>('INSTAGRAM_PROVIDER', 'stub');
        if (type === 'rapidapi') return new RapidApiInstagramProvider(config);
        return new StubInstagramProvider();
      },
      inject: [ConfigService],
    },
    InstagramSyncService,
  ],
  exports: [INSTAGRAM_PROVIDER, InstagramSyncService],
})
export class InstagramModule {}
