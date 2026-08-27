import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module';
import { INSTAGRAM_PROVIDER } from './instagram.constants';
import { InstagramSyncService } from './instagram-sync.service';
import { StubInstagramProvider } from './providers/stub.instagram.provider';
import { RapidApiInstagramProvider } from './providers/rapidapi.instagram.provider';
import { IgAvatarController } from './ig-avatar.controller';
import { IgHandleController } from './ig-handle.controller';
import { IgImageService } from './ig-image.service';
import { IgProfileCache } from './ig-profile-cache';

@Module({
  imports: [DatabaseModule],
  controllers: [IgAvatarController, IgHandleController],
  providers: [
    {
      provide: INSTAGRAM_PROVIDER,
      useFactory: (config: ConfigService) => {
        const type = config.get<string>('INSTAGRAM_PROVIDER', 'stub');
        if (type === 'rapidapi') {
          // Uma instância de cache por processo, compartilhada entre o passo
          // de perfil da sincronização e a verificação de existência de @ —
          // é o que faz o reaproveitamento valer (ver ig-profile-cache.ts).
          return new RapidApiInstagramProvider(
            config,
            new IgProfileCache(config),
          );
        }
        return new StubInstagramProvider();
      },
      inject: [ConfigService],
    },
    InstagramSyncService,
    IgImageService,
  ],
  exports: [INSTAGRAM_PROVIDER, InstagramSyncService, IgImageService],
})
export class InstagramModule {}
