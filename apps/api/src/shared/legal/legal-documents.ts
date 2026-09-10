/**
 * Versões dos documentos legais em vigor.
 *
 * FONTE ÚNICA. Quem estampa a versão no aceite é o SERVIDOR, nunca o cliente:
 * se o front mandasse a versão, uma requisição forjada gravaria "aceitei a
 * v0.1" e o registro perderia valor como prova. O cliente só informa que
 * marcou a caixa.
 *
 * Ao publicar uma versão nova de qualquer um dos dois documentos, subir o
 * número aqui é o que faz o produto voltar a pedir aceite de quem já tinha
 * aceitado a anterior (ver `CreatorsService.recordLegalAcceptance`). Não
 * reaproveitar número: a versão é o que amarra o registro ao texto.
 */
export const TERMS_VERSION = '1.0';
export const PRIVACY_VERSION = '1.0';

export interface LegalAcceptanceFields {
  acceptedTermsVersion: string;
  acceptedPrivacyVersion: string;
  acceptedAt: Date;
  declaredAdultAt: Date;
}

/**
 * O que é gravado no `User` quando alguém marca as caixas de aceite e de
 * maioridade num fluxo de criação de conta.
 *
 * Existe como função (e não como objeto solto) porque três fluxos gravam isto
 * — cadastro de creator, cadastro de marca e candidatura pública — e uma
 * quarta cópia à mão é onde a versão errada entraria.
 *
 * `declaredAdultAt` sai junto porque as duas declarações acontecem no mesmo
 * instante, na mesma tela. São campos separados de propósito: uma é aceite de
 * documento versionado, a outra é uma afirmação de fato sobre a pessoa.
 */
export function legalAcceptanceFields(
  now: Date = new Date(),
): LegalAcceptanceFields {
  return {
    acceptedTermsVersion: TERMS_VERSION,
    acceptedPrivacyVersion: PRIVACY_VERSION,
    acceptedAt: now,
    declaredAdultAt: now,
  };
}
