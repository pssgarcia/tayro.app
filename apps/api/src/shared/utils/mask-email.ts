/**
 * Reduz um e-mail à forma mínima que ainda serve pra diagnóstico.
 *
 * Por que existe: os caminhos de FALHA de envio de e-mail logavam o endereço
 * inteiro, e log de aplicação vai pro Railway, onde fica retido e acessível a
 * quem tem o painel. O endereço completo não é necessário pra investigar
 * "por que este envio falhou" — o domínio (provedor recusou? domínio
 * inexistente?) e um discriminador pra casar com o relato de quem reclamou
 * são. Ver especificação em specs/email-notifications.
 *
 * `ana.silva@gmail.com` → `an***@gmail.com`
 *
 * Mantém o domínio inteiro de propósito: é ele que diz se o problema é do
 * provedor de destino, e não identifica a pessoa por si só.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '(sem endereço)';

  const at = email.lastIndexOf('@');
  if (at <= 0) return '(endereço inválido)';

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  // 1 caractere para local muito curto: `a@x.com` não deve virar `a***`, que
  // entregaria a parte local inteira.
  const keep = local.length >= 4 ? 2 : 1;

  return `${local.slice(0, keep)}***@${domain}`;
}
