/**
 * Garante @MaxLength em todo campo de texto livre dos DTOs públicos/credenciais.
 * Defesa contra payload spam / DoS (CLAUDE.md: regra inviolável).
 *
 * Usa o mesmo pipeline do ValidationPipe global: plainToInstance (aplica
 * @Transform) + validate (aplica os decorators de class-validator).
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublicApplyDto } from '../../modules/creators/application/dtos/public-apply.dto';
import { LoginDto } from '../../modules/auth/application/dtos/login.dto';
import { RegisterBrandDto } from '../../modules/auth/application/dtos/register-brand.dto';
import { RegisterInfluencerDto } from '../../modules/auth/application/dtos/register-influencer.dto';

const hasError = (errors: { property: string }[], property: string) =>
  errors.some((e) => e.property === property);

async function validateDto<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
) {
  const instance = plainToInstance(cls, payload);
  return validate(instance as object);
}

describe('DTO @MaxLength — defesa contra payload spam/DoS', () => {
  describe('PublicApplyDto', () => {
    const valid = {
      igHandle: 'anafitness',
      email: 'ana@email.com',
      name: 'Ana Fitness',
      message: 'Adoraria colaborar!',
    };

    it('aceita payload válido', async () => {
      expect(await validateDto(PublicApplyDto, valid)).toHaveLength(0);
    });

    it('rejeita message acima de 1000 chars', async () => {
      const errors = await validateDto(PublicApplyDto, {
        ...valid,
        message: 'a'.repeat(1001),
      });
      expect(hasError(errors, 'message')).toBe(true);
    });

    it('rejeita name acima de 100 chars', async () => {
      const errors = await validateDto(PublicApplyDto, {
        ...valid,
        name: 'a'.repeat(101),
      });
      expect(hasError(errors, 'name')).toBe(true);
    });

    it('rejeita email acima de 254 chars', async () => {
      const longEmail = `${'a'.repeat(250)}@x.com`;
      const errors = await validateDto(PublicApplyDto, {
        ...valid,
        email: longEmail,
      });
      expect(hasError(errors, 'email')).toBe(true);
    });
  });

  describe('LoginDto', () => {
    it('aceita senha dentro do limite do bcrypt (72)', async () => {
      const errors = await validateDto(LoginDto, {
        email: 'a@b.com',
        password: 'a'.repeat(72),
      });
      expect(errors).toHaveLength(0);
    });

    it('rejeita senha acima de 72 chars (truncamento do bcrypt)', async () => {
      const errors = await validateDto(LoginDto, {
        email: 'a@b.com',
        password: 'a'.repeat(73),
      });
      expect(hasError(errors, 'password')).toBe(true);
    });
  });

  describe('RegisterBrandDto', () => {
    const valid = {
      email: 'marca@x.com',
      password: 'senhaSegura123',
      brandName: 'Marca',
      niches: ['fitness'],
      website: 'https://x.com',
    };

    it('aceita payload válido', async () => {
      expect(await validateDto(RegisterBrandDto, valid)).toHaveLength(0);
    });

    it('rejeita brandName acima de 100 chars', async () => {
      const errors = await validateDto(RegisterBrandDto, {
        ...valid,
        brandName: 'a'.repeat(101),
      });
      expect(hasError(errors, 'brandName')).toBe(true);
    });

    it('rejeita password acima de 72 chars', async () => {
      const errors = await validateDto(RegisterBrandDto, {
        ...valid,
        password: 'a'.repeat(73),
      });
      expect(hasError(errors, 'password')).toBe(true);
    });

    it('rejeita website acima de 2048 chars', async () => {
      const errors = await validateDto(RegisterBrandDto, {
        ...valid,
        website: `https://x.com/${'a'.repeat(2048)}`,
      });
      expect(hasError(errors, 'website')).toBe(true);
    });

    it('rejeita mais de 20 niches', async () => {
      const errors = await validateDto(RegisterBrandDto, {
        ...valid,
        niches: Array.from({ length: 21 }, (_, i) => `n${i}`),
      });
      expect(hasError(errors, 'niches')).toBe(true);
    });

    it('rejeita niche individual acima de 50 chars', async () => {
      const errors = await validateDto(RegisterBrandDto, {
        ...valid,
        niches: ['a'.repeat(51)],
      });
      expect(hasError(errors, 'niches')).toBe(true);
    });
  });

  describe('RegisterInfluencerDto', () => {
    const valid = {
      email: 'inf@x.com',
      password: 'senhaSegura123',
      name: 'Ana',
      instagramHandle: 'ana',
      niches: ['fitness'],
    };

    it('aceita payload válido', async () => {
      expect(await validateDto(RegisterInfluencerDto, valid)).toHaveLength(0);
    });

    it('rejeita name acima de 100 chars', async () => {
      const errors = await validateDto(RegisterInfluencerDto, {
        ...valid,
        name: 'a'.repeat(101),
      });
      expect(hasError(errors, 'name')).toBe(true);
    });

    it('rejeita password acima de 72 chars', async () => {
      const errors = await validateDto(RegisterInfluencerDto, {
        ...valid,
        password: 'a'.repeat(73),
      });
      expect(hasError(errors, 'password')).toBe(true);
    });
  });
});
