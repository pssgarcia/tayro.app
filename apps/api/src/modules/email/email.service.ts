import { Injectable, Inject, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.constants';
import type { EmailProvider, EmailMessage } from './email.types';

interface ApplicationDecisionEmailParams {
  to: string;
  creatorName: string;
  campaignTitle: string;
  brandName: string;
}

interface ClaimAccountEmailParams {
  to: string;
  creatorName: string;
  claimUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  async sendApplicationApproved(
    params: ApplicationDecisionEmailParams,
  ): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: `Sua candidatura foi aprovada — ${params.campaignTitle}`,
      html: `
        <p>Oi, ${params.creatorName}!</p>
        <p><strong>${params.brandName}</strong> aprovou sua candidatura para <strong>${params.campaignTitle}</strong>.</p>
        <p>Acesse a plataforma para ver os próximos passos.</p>
      `,
    });
  }

  async sendApplicationRejected(
    params: ApplicationDecisionEmailParams,
  ): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: `Atualização sobre sua candidatura — ${params.campaignTitle}`,
      html: `
        <p>Oi, ${params.creatorName}!</p>
        <p><strong>${params.brandName}</strong> avaliou sua candidatura para <strong>${params.campaignTitle}</strong> e, desta vez, decidiu seguir com outro perfil.</p>
        <p>Continue explorando outros programas na plataforma — sempre têm novidades.</p>
      `,
    });
  }

  async sendClaimAccount(params: ClaimAccountEmailParams): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: 'Defina sua senha para acessar a plataforma',
      html: `
        <p>Oi, ${params.creatorName}!</p>
        <p>Sua conta na plataforma já existe — falta só definir uma senha para acessar.</p>
        <p><a href="${params.claimUrl}">Clique aqui para definir sua senha</a></p>
        <p>O link expira em 7 dias.</p>
      `,
    });
  }

  // Best-effort: falha de e-mail nunca deve derrubar a ação de negócio
  // (approve/reject) que a originou. Loga e segue.
  private async sendBestEffort(message: EmailMessage): Promise<void> {
    try {
      await this.provider.send(message);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao enviar e-mail para ${message.to}: ${reason}`);
    }
  }
}
