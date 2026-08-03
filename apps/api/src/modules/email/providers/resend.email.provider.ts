import { Resend } from 'resend';
import type { ConfigService } from '@nestjs/config';
import type { EmailProvider, EmailMessage } from '../email.types';

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.client = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = config.getOrThrow<string>('EMAIL_FROM');
  }

  async send(message: EmailMessage): Promise<void> {
    // A SDK do Resend não lança em erro de API — devolve { data, error }.
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
