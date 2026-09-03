/**
 * Telefone de contato da creator (`Influencer.phone`).
 *
 * É texto livre de propósito: a pessoa digita com ou sem DDD, com ou sem
 * máscara, com ou sem `+55`. Não normalizamos na entrada — quem interpreta é
 * o `whatsappLinkFromPhone` do front, que só monta o link quando a contagem
 * de dígitos fecha (ver `specs/creator-roster`). Aqui a validação só garante
 * que é plausível: dígitos e a pontuação usual de telefone, num tamanho
 * possível.
 *
 * Mora aqui (e não copiado em cada DTO) porque agora são três entradas —
 * candidatura pública, cadastro de creator e edição de perfil. Mudar o
 * alfabeto aceito exige mudar aqui e no equivalente do front
 * (`utils/format.ts` → `PHONE_FORMAT`).
 */
export const PHONE_FORMAT = /^[0-9()+\-\s]{8,20}$/;

/** Mesmo formato, mas aceita vazio — na edição de perfil, apagar o campo é
 *  como a creator remove o telefone que já tinha. */
export const PHONE_FORMAT_OR_EMPTY = /^$|^[0-9()+\-\s]{8,20}$/;

export const PHONE_FORMAT_MESSAGE =
  'Telefone inválido — use apenas números, espaços, ( ) - ou +';

export const PHONE_MAX_LENGTH = 20;
