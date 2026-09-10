import { Logger } from '@nestjs/common';
import type { EmailProvider, EmailMessage } from '../email.types';
import { maskEmail } from '../../../shared/utils/mask-email';

// Default de dev/test — não manda e-mail de verdade, só loga. Evita queimar
// cota do Resend em toda rodada de teste/desenvolvimento local.
//
// Destinatário mascarado pelo mesmo motivo do EmailService: em produção o
// provedor é o Resend, mas o default do .env.example é `stub`, então um deploy
// sem `EMAIL_PROVIDER` definido cairia aqui logando endereços reais. O LINK
// continua sendo logado inteiro de propósito: é a única forma de testar claim
// e reset em dev sem configurar o Resend.
export class StubEmailProvider implements EmailProvider {
  private readonly logger = new Logger(StubEmailProvider.name);

  send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `[stub] e-mail para ${maskEmail(message.to)}: "${message.subject}"`,
    );
    // Loga qualquer link presente no corpo — é a única forma de testar fluxos
    // como o claim (definir senha) em dev sem mandar e-mail de verdade.
    const links = message.html.match(/https?:\/\/[^\s"<]+/g);
    if (links) {
      this.logger.log(`[stub] link(s): ${links.join(', ')}`);
    }
    return Promise.resolve();
  }
}
