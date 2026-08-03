import { Logger } from '@nestjs/common';
import type { EmailProvider, EmailMessage } from '../email.types';

// Default de dev/test — não manda e-mail de verdade, só loga. Evita queimar
// cota do Resend em toda rodada de teste/desenvolvimento local.
export class StubEmailProvider implements EmailProvider {
  private readonly logger = new Logger(StubEmailProvider.name);

  send(message: EmailMessage): Promise<void> {
    this.logger.log(`[stub] e-mail para ${message.to}: "${message.subject}"`);
    // Loga qualquer link presente no corpo — é a única forma de testar fluxos
    // como o claim (definir senha) em dev sem mandar e-mail de verdade.
    const links = message.html.match(/https?:\/\/[^\s"<]+/g);
    if (links) {
      this.logger.log(`[stub] link(s): ${links.join(', ')}`);
    }
    return Promise.resolve();
  }
}
