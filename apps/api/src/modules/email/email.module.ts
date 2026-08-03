import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from './email.constants';
import { EmailService } from './email.service';
import { StubEmailProvider } from './providers/stub.email.provider';
import { ResendEmailProvider } from './providers/resend.email.provider';

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: ConfigService) => {
        const type = config.get<string>('EMAIL_PROVIDER', 'stub');
        if (type === 'resend') return new ResendEmailProvider(config);
        return new StubEmailProvider();
      },
      inject: [ConfigService],
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
