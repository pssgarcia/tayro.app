import { applyDecorators } from '@nestjs/common';
import { Equals, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * As duas caixas obrigatórias dos fluxos de criação de conta, como
 * decoradores reaproveitáveis.
 *
 * `@Equals(true)` é o que torna impossível criar conta sem aceite: não é uma
 * validação de forma (isso seria `@IsBoolean` sozinho, que aceitaria
 * `false`), é uma regra de negócio no DTO. Com o `ValidationPipe` global
 * (`whitelist` + `forbidNonWhitelisted`), omitir o campo também falha — o
 * aceite não tem default silencioso.
 *
 * O cliente manda apenas que marcou. Quais VERSÕES valem é decisão do
 * servidor (`legalAcceptanceFields`), nunca do corpo da requisição.
 */
export const AcceptedTermsAndPrivacyField = () =>
  applyDecorators(
    ApiProperty({
      example: true,
      description:
        'Aceite dos Termos de Uso e da Política de Privacidade. Precisa ser true.',
    }),
    IsBoolean(),
    Equals(true, {
      message:
        'É necessário aceitar os Termos de Uso e a Política de Privacidade',
    }),
  );

export const DeclaredAdultField = () =>
  applyDecorators(
    ApiProperty({
      example: true,
      description:
        'Declaração de que a pessoa tem 18 anos ou mais. Precisa ser true.',
    }),
    IsBoolean(),
    Equals(true, {
      message: 'É necessário declarar que você tem 18 anos ou mais',
    }),
  );
