import { dict } from '../i18n';

/**
 * Resolve a config de contato do produto a partir de `import.meta.env`.
 *
 * Função pura (recebe o env, não lê global) pra ser testável com um objeto
 * simples — mesmo padrão do `resolveWebSentryConfig`.
 *
 * Sem `VITE_CONTACT_WHATSAPP` (dev, CI, preview) → `whatsappUrl: undefined`, e
 * quem consome degrada o CTA pra `/register/brand`. O número NÃO mora no código:
 * quem define é a env da Vercel, senão trocar de contato vira deploy.
 */
export interface ContactConfig {
  /** Link `wa.me` com a mensagem já pré-preenchida, ou `undefined` se a env
   *  estiver ausente/em branco. */
  whatsappUrl: string | undefined;
}

export function resolveContactConfig(env: ImportMetaEnv): ContactConfig {
  // Aceita número já limpo ou mascarado ("+55 (37) 9...") — só os dígitos importam.
  const digits = (env.VITE_CONTACT_WHATSAPP ?? '').replace(/\D/g, '');

  if (digits === '') return { whatsappUrl: undefined };

  return {
    // A mensagem já preenchida sai no idioma da página que a pessoa leu: quem
    // escreve é ela, não nós. `dict()` e não hook porque isto não é componente.
    whatsappUrl: `https://wa.me/${digits}?text=${encodeURIComponent(
      dict().hero.whatsappMensagem,
    )}`,
  };
}
