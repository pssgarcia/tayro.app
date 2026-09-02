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
import { ChangePasswordDto } from '../../modules/auth/application/dtos/change-password.dto';
import { ChangeEmailDto } from '../../modules/auth/application/dtos/change-email.dto';
import { RegisterBrandDto } from '../../modules/auth/application/dtos/register-brand.dto';
import { RegisterInfluencerDto } from '../../modules/auth/application/dtos/register-influencer.dto';
import { CreateCampaignDto } from '../../modules/campaigns/application/dtos/create-campaign.dto';
import { UpdateCampaignDto } from '../../modules/campaigns/application/dtos/update-campaign.dto';
import { ListCampaignsDto } from '../../modules/campaigns/application/dtos/list-campaigns.dto';
import { CreateRewardDto } from '../../modules/rewards/application/dtos/create-reward.dto';

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
      phone: '(11) 91234-5678',
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

    it('rejeita name vazio', async () => {
      const errors = await validateDto(PublicApplyDto, { ...valid, name: '' });
      expect(hasError(errors, 'name')).toBe(true);
    });

    it('rejeita phone vazio', async () => {
      const errors = await validateDto(PublicApplyDto, { ...valid, phone: '' });
      expect(hasError(errors, 'phone')).toBe(true);
    });

    it('rejeita phone acima de 20 chars', async () => {
      const errors = await validateDto(PublicApplyDto, {
        ...valid,
        phone: '1'.repeat(21),
      });
      expect(hasError(errors, 'phone')).toBe(true);
    });

    it('rejeita phone com caracteres inválidos', async () => {
      const errors = await validateDto(PublicApplyDto, {
        ...valid,
        phone: 'não é telefone',
      });
      expect(hasError(errors, 'phone')).toBe(true);
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

  describe('ChangePasswordDto', () => {
    it('aceita as duas senhas dentro do limite do bcrypt (72)', async () => {
      const errors = await validateDto(ChangePasswordDto, {
        currentPassword: 'a'.repeat(72),
        newPassword: 'b'.repeat(72),
      });
      expect(errors).toHaveLength(0);
    });

    it('rejeita currentPassword acima de 72 chars', async () => {
      const errors = await validateDto(ChangePasswordDto, {
        currentPassword: 'a'.repeat(73),
        newPassword: 'senhaNova123',
      });
      expect(hasError(errors, 'currentPassword')).toBe(true);
    });

    it('rejeita newPassword acima de 72 chars', async () => {
      const errors = await validateDto(ChangePasswordDto, {
        currentPassword: 'senhaAtual123',
        newPassword: 'a'.repeat(73),
      });
      expect(hasError(errors, 'newPassword')).toBe(true);
    });

    it('rejeita newPassword abaixo de 8 chars', async () => {
      const errors = await validateDto(ChangePasswordDto, {
        currentPassword: 'senhaAtual123',
        newPassword: 'curta12',
      });
      expect(hasError(errors, 'newPassword')).toBe(true);
    });
  });

  describe('ChangeEmailDto', () => {
    it('aceita payload válido', async () => {
      const errors = await validateDto(ChangeEmailDto, {
        email: 'novo@example.com',
        password: 'a'.repeat(72),
      });
      expect(errors).toHaveLength(0);
    });

    it('rejeita email acima de 254 chars', async () => {
      const longEmail = `${'a'.repeat(250)}@x.com`;
      const errors = await validateDto(ChangeEmailDto, {
        email: longEmail,
        password: 'senhaAtual123',
      });
      expect(hasError(errors, 'email')).toBe(true);
    });

    it('rejeita email malformado', async () => {
      const errors = await validateDto(ChangeEmailDto, {
        email: 'não-é-email',
        password: 'senhaAtual123',
      });
      expect(hasError(errors, 'email')).toBe(true);
    });

    it('rejeita password acima de 72 chars', async () => {
      const errors = await validateDto(ChangeEmailDto, {
        email: 'novo@example.com',
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

  // Campos que a MARCA escreve — autenticada, mas ainda assim texto livre sem
  // teto até 2026-08-23 (era o gap registrado em specs/campaign-lifecycle).
  // Guard e role não limitam tamanho de corpo: uma conta legítima bastava pra
  // gravar megabytes por campo.
  describe('CreateCampaignDto', () => {
    const valid = {
      title: 'Campanha Verão',
      description: 'Preciso de conteúdo mostrando o produto no treino.',
      niches: ['fitness'],
      maxSpots: 5,
    };

    it('aceita payload válido', async () => {
      expect(await validateDto(CreateCampaignDto, valid)).toHaveLength(0);
    });

    it('aceita title exatamente no limite (100 chars)', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        title: 'a'.repeat(100),
      });
      expect(hasError(errors, 'title')).toBe(false);
    });

    it('rejeita title acima de 100 chars', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        title: 'a'.repeat(101),
      });
      expect(hasError(errors, 'title')).toBe(true);
    });

    it('rejeita description acima de 2000 chars', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        description: 'a'.repeat(2001),
      });
      expect(hasError(errors, 'description')).toBe(true);
    });

    it('rejeita briefUrl acima de 2048 chars', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        briefUrl: `https://x.com/${'a'.repeat(2048)}`,
      });
      expect(hasError(errors, 'briefUrl')).toBe(true);
    });

    it('rejeita offerDescription acima de 500 chars', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        offerDescription: 'a'.repeat(501),
      });
      expect(hasError(errors, 'offerDescription')).toBe(true);
    });

    it('rejeita rewardValue acima de 500 chars (campo deprecated ainda aceito)', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        rewardValue: 'a'.repeat(501),
      });
      expect(hasError(errors, 'rewardValue')).toBe(true);
    });

    it('rejeita mais de 20 niches', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        niches: Array.from({ length: 21 }, (_, i) => `n${i}`),
      });
      expect(hasError(errors, 'niches')).toBe(true);
    });

    it('rejeita niche individual acima de 50 chars', async () => {
      const errors = await validateDto(CreateCampaignDto, {
        ...valid,
        niches: ['a'.repeat(51)],
      });
      expect(hasError(errors, 'niches')).toBe(true);
    });
  });

  // UpdateCampaignDto = PartialType(CreateCampaignDto): os tetos precisam
  // valer na edição também, senão o limite da criação seria contornável com
  // um PATCH logo depois.
  describe('UpdateCampaignDto (herda as restrições via PartialType)', () => {
    it('aceita atualização parcial dentro dos limites', async () => {
      expect(
        await validateDto(UpdateCampaignDto, { title: 'Novo título' }),
      ).toHaveLength(0);
    });

    it('rejeita title acima de 100 chars', async () => {
      const errors = await validateDto(UpdateCampaignDto, {
        title: 'a'.repeat(101),
      });
      expect(hasError(errors, 'title')).toBe(true);
    });

    it('rejeita description acima de 2000 chars', async () => {
      const errors = await validateDto(UpdateCampaignDto, {
        description: 'a'.repeat(2001),
      });
      expect(hasError(errors, 'description')).toBe(true);
    });
  });

  // Filtro de nicho da vitrine pública: query string, origem anônima, e o
  // service faz .split(',') em cima dela.
  describe('ListCampaignsDto', () => {
    it('aceita filtro de nichos normal', async () => {
      expect(
        await validateDto(ListCampaignsDto, { niches: 'fitness,wellness' }),
      ).toHaveLength(0);
    });

    it('rejeita filtro de nichos acima de 200 chars', async () => {
      const errors = await validateDto(ListCampaignsDto, {
        niches: 'a'.repeat(201),
      });
      expect(hasError(errors, 'niches')).toBe(true);
    });
  });

  describe('CreateRewardDto', () => {
    const valid = {
      influencerId: '11111111-1111-4111-8111-111111111111',
      campaignId: '22222222-2222-4222-8222-222222222222',
      type: 'MONETARY',
      value: 'R$300',
    };

    it('aceita payload válido', async () => {
      expect(await validateDto(CreateRewardDto, valid)).toHaveLength(0);
    });

    it('rejeita value acima de 100 chars', async () => {
      const errors = await validateDto(CreateRewardDto, {
        ...valid,
        value: 'a'.repeat(101),
      });
      expect(hasError(errors, 'value')).toBe(true);
    });
  });
});
