import { Injectable, Inject, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.constants';
import type { EmailProvider, EmailMessage } from './email.types';
import { maskEmail } from '../../shared/utils/mask-email';

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

interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

interface PartnershipResultEmailParams {
  to: string;
  creatorName: string;
  campaignTitle: string;
  brandName: string;
}

interface EmailChangedParams {
  to: string;
  newEmail: string;
}

interface AccountDeletedEmailParams {
  to: string;
  creatorName: string;
}

interface NewAccountNotificationParams {
  to: string;
  role: 'INFLUENCER' | 'BRAND';
  name: string;
  email: string;
  /** Ex: @ do Instagram. Não existe equivalente pra marca — fica de fora. */
  detail?: string;
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
      subject: `Sua candidatura foi aprovada: ${params.campaignTitle}`,
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
      subject: `Atualização sobre sua candidatura: ${params.campaignTitle}`,
      html: `
        <p>Oi, ${params.creatorName}!</p>
        <p><strong>${params.brandName}</strong> avaliou sua candidatura para <strong>${params.campaignTitle}</strong> e, desta vez, decidiu seguir com outro perfil.</p>
        <p>Continue explorando outras campanhas na plataforma. Sempre têm novidades.</p>
      `,
    });
  }

  async sendClaimAccount(params: ClaimAccountEmailParams): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: 'Defina sua senha para acessar a plataforma',
      html: `
        <p>Oi, ${params.creatorName}!</p>
        <p>Sua conta na plataforma já existe. Falta só definir uma senha para acessar.</p>
        <p><a href="${params.claimUrl}">Clique aqui para definir sua senha</a></p>
        <p>O link expira em 7 dias.</p>
      `,
    });
  }

  // Sem nome personalizado de propósito: ao contrário do claim (só
  // influencer), reset serve BRAND e INFLUENCER, e buscar o nome exigiria um
  // include extra sem necessidade real pra um e-mail transacional de segurança.
  async sendPasswordReset(params: PasswordResetEmailParams): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: 'Redefinir sua senha',
      html: `
        <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
        <p><a href="${params.resetUrl}">Clique aqui para definir uma nova senha</a></p>
        <p>O link expira em 1 hora. Se você não pediu isso, ignore este e-mail.</p>
      `,
    });
  }

  /**
   * A marca devolveu o resultado da parceria (diferencial nº 3 —
   * transparência bilateral). Não repete os números aqui de propósito: são
   * dado da parceria dos dois lados, e e-mail é o canal mais fácil de
   * encaminhar por engano. O convite é abrir o Registro dela.
   */
  async sendPartnershipResult(
    params: PartnershipResultEmailParams,
  ): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: `${params.brandName} registrou o resultado da sua parceria`,
      html: `
        <p>Oi, ${params.creatorName}!</p>
        <p><strong>${params.brandName}</strong> registrou o resultado da parceria de <strong>${params.campaignTitle}</strong>.</p>
        <p>Abra seu registro na plataforma para ver o que ela informou.</p>
      `,
    });
  }

  // Manda pro endereço ANTIGO (params.to é sempre o e-mail de antes da troca,
  // nunca o novo) — é o alerta de segurança que dá à conta legítima a chance
  // de reagir se a troca não foi ela.
  async sendEmailChanged(params: EmailChangedParams): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: 'O e-mail da sua conta foi alterado',
      html: `
        <p>O e-mail da sua conta foi alterado para <strong>${params.newEmail}</strong>.</p>
        <p>Se você não fez essa alteração, entre em contato com a gente imediatamente.</p>
      `,
    });
  }

  // Manda pro e-mail ORIGINAL, capturado pelo chamador antes do tombstone
  // gravado na exclusão — o endereço novo (deleted-<uuid>@tayro.invalid)
  // não é alcançável por ninguém.
  async sendAccountDeleted(params: AccountDeletedEmailParams): Promise<void> {
    await this.sendBestEffort({
      to: params.to,
      subject: 'Sua conta foi apagada',
      html: `
        <p>Oi, ${params.creatorName}!</p>
        <p>Sua conta na plataforma foi apagada, como você pediu. Nome, foto, telefone, @ do
        Instagram e demais dados de identificação foram removidos.</p>
        <p>Registros de parceria e pagamento continuam existindo para as marcas com quem você
        trabalhou, sem nenhuma informação que identifique você.</p>
      `,
    });
  }

  /**
   * Notificação pro OPERADOR (Pedro), não pro usuário — instrumentação do
   * funil (roadmap.md, AGORA #0), não efeito colateral do cadastro em si.
   * Quem decide SE dispara (existe `ADMIN_NOTIFICATION_EMAIL`?) e PRA QUEM é
   * o chamador — este método só monta e manda. best-effort por herdar
   * `sendBestEffort`: nunca deve atrapalhar o cadastro que a originou.
   */
  async sendNewAccountNotification(
    params: NewAccountNotificationParams,
  ): Promise<void> {
    const roleLabel = params.role === 'BRAND' ? 'marca' : 'creator';
    await this.sendBestEffort({
      to: params.to,
      subject: `Nova conta no TAYRO (${roleLabel}): ${params.name}`,
      html: `
        <p>Uma conta nova de <strong>${roleLabel}</strong> acabou de ser criada.</p>
        <p><strong>Nome:</strong> ${params.name}</p>
        <p><strong>E-mail:</strong> ${params.email}</p>
        ${params.detail ? `<p><strong>Instagram:</strong> ${params.detail}</p>` : ''}
      `,
    });
  }

  // Best-effort: falha de e-mail nunca deve derrubar a ação de negócio
  // (approve/reject) que a originou. Loga e segue.
  //
  // O destinatário vai MASCARADO: log de aplicação fica retido no Railway e
  // acessível a quem tem o painel, e endereço inteiro não é necessário pra
  // diagnosticar uma falha de envio. O domínio (que o mascaramento preserva) é
  // o que diz se o problema é do provedor de destino; o assunto identifica
  // qual envio falhou. Ver shared/utils/mask-email.ts.
  private async sendBestEffort(message: EmailMessage): Promise<void> {
    try {
      await this.provider.send(message);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Falha ao enviar e-mail "${message.subject}" para ${maskEmail(message.to)}: ${reason}`,
      );
    }
  }
}
