import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  legalAcceptanceFields,
} from './legal-documents';
import { RegisterBrandDto } from '../../modules/auth/application/dtos/register-brand.dto';
import { RegisterInfluencerDto } from '../../modules/auth/application/dtos/register-influencer.dto';
import { PublicApplyDto } from '../../modules/creators/application/dtos/public-apply.dto';

type DtoClass = new () => object;

async function errorsFor(cls: DtoClass, payload: Record<string, unknown>) {
  return validate(plainToInstance(cls, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

const hasError = (
  errors: Awaited<ReturnType<typeof validate>>,
  property: string,
) => errors.some((e) => e.property === property);

// Payloads mínimos válidos de cada fluxo de entrada, SEM as caixas de aceite.
const BASE_PAYLOADS: Record<string, [DtoClass, Record<string, unknown>]> = {
  RegisterBrandDto: [
    RegisterBrandDto,
    {
      email: 'marca@example.com',
      password: 'senhaSegura1',
      brandName: 'Marca',
    },
  ],
  RegisterInfluencerDto: [
    RegisterInfluencerDto,
    {
      email: 'ana@example.com',
      password: 'senhaSegura1',
      name: 'Ana',
      phone: '(11) 91234-5678',
      instagramHandle: 'anafit',
    },
  ],
  PublicApplyDto: [
    PublicApplyDto,
    {
      igHandle: 'anafit',
      email: 'ana@example.com',
      name: 'Ana',
      phone: '(11) 91234-5678',
    },
  ],
};

describe('legalAcceptanceFields', () => {
  it('estampa as versões em vigor e o mesmo instante nas duas declarações', () => {
    const now = new Date('2026-09-04T12:00:00.000Z');

    expect(legalAcceptanceFields(now)).toEqual({
      acceptedTermsVersion: TERMS_VERSION,
      acceptedPrivacyVersion: PRIVACY_VERSION,
      acceptedAt: now,
      declaredAdultAt: now,
    });
  });

  it('grava VERSÃO, nunca um booleano', () => {
    const fields = legalAcceptanceFields();

    expect(typeof fields.acceptedTermsVersion).toBe('string');
    expect(typeof fields.acceptedPrivacyVersion).toBe('string');
    expect(fields.acceptedTermsVersion).not.toBe('');
    expect(fields.acceptedPrivacyVersion).not.toBe('');
  });
});

// É a regra "impossibilidade de concluir o cadastro sem marcar o checkbox",
// no lado que não depende do navegador: mesmo que alguém chame a API direto,
// sem as duas caixas não existe conta.
describe.each(Object.entries(BASE_PAYLOADS))(
  '%s — aceite obrigatório',
  (_name, [cls, base]) => {
    it('aceita o payload com as duas caixas marcadas', async () => {
      const errors = await errorsFor(cls, {
        ...base,
        acceptedTermsAndPrivacy: true,
        declaredAdult: true,
      });

      expect(errors).toHaveLength(0);
    });

    it('rejeita quando o aceite dos documentos está ausente', async () => {
      const errors = await errorsFor(cls, { ...base, declaredAdult: true });

      expect(hasError(errors, 'acceptedTermsAndPrivacy')).toBe(true);
    });

    it('rejeita quando o aceite dos documentos é false (caixa desmarcada)', async () => {
      const errors = await errorsFor(cls, {
        ...base,
        acceptedTermsAndPrivacy: false,
        declaredAdult: true,
      });

      expect(hasError(errors, 'acceptedTermsAndPrivacy')).toBe(true);
    });

    it('rejeita quando a declaração de maioridade está ausente', async () => {
      const errors = await errorsFor(cls, {
        ...base,
        acceptedTermsAndPrivacy: true,
      });

      expect(hasError(errors, 'declaredAdult')).toBe(true);
    });

    it('rejeita quando a declaração de maioridade é false', async () => {
      const errors = await errorsFor(cls, {
        ...base,
        acceptedTermsAndPrivacy: true,
        declaredAdult: false,
      });

      expect(hasError(errors, 'declaredAdult')).toBe(true);
    });

    it('rejeita string "true" no lugar do booleano', async () => {
      const errors = await errorsFor(cls, {
        ...base,
        acceptedTermsAndPrivacy: 'true',
        declaredAdult: 'true',
      });

      expect(hasError(errors, 'acceptedTermsAndPrivacy')).toBe(true);
      expect(hasError(errors, 'declaredAdult')).toBe(true);
    });

    it('o cliente NÃO consegue ditar a versão aceita', async () => {
      // `forbidNonWhitelisted` do ValidationPipe global recusa campo que não
      // existe no DTO: quem estampa a versão é o servidor.
      const errors = await errorsFor(cls, {
        ...base,
        acceptedTermsAndPrivacy: true,
        declaredAdult: true,
        acceptedTermsVersion: '0.1',
      });

      expect(hasError(errors, 'acceptedTermsVersion')).toBe(true);
    });
  },
);
