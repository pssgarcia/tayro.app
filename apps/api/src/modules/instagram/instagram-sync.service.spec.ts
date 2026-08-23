/**
 * InstagramSyncService — núcleo do contrato de staleness e falha.
 *
 * Este serviço não tinha teste de unidade nenhum: só era exercitado de lado,
 * por quem o chama. Três invariantes valem dinheiro aqui, porque cada chamada
 * ao provedor consome cota de uma API externa paga por uso:
 *   1. dado fresco não é rebuscado (sem `force`);
 *   2. falha PRESERVA o último valor bom — nunca zera o perfil da creator;
 *   3. TODA tentativa carimba `igFetchedAt`, inclusive a que falhou — é o que
 *      faz o cooldown do refresh manual valer também para o estado FAILED.
 *      Sem isso, um perfil quebrado vira botão de queimar cota à vontade.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IgFetchStatus } from '@prisma/client';
import { InstagramSyncService } from './instagram-sync.service';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { INSTAGRAM_PROVIDER } from './instagram.constants';
import { IgImageService } from './ig-image.service';

const perfil = {
  followers: 10_000,
  profilePicUrl: 'https://scontent.cdninstagram.com/pic.jpg',
  recentPosts: [
    { thumbnail: 't1', likes: 300, comments: 100, permalink: 'p1' },
    { thumbnail: 't2', likes: 400, comments: 200, permalink: 'p2' },
  ],
};

describe('InstagramSyncService', () => {
  let service: InstagramSyncService;
  let prisma: jest.Mocked<any>;
  let provider: { fetchProfile: jest.Mock };
  let igImages: { storeFromProfile: jest.Mock };
  let config: { get: jest.Mock };
  const agora = new Date('2026-08-23T12:00:00.000Z');

  /** Retorno do findUnique inicial (o SELECT enxuto do início do refresh). */
  const influencerNoBanco = (overrides: Record<string, unknown> = {}) => ({
    instagramHandle: 'anafit',
    igFetchStatus: IgFetchStatus.OK,
    igFetchedAt: null,
    ...overrides,
  });

  /** `data` da chamada de update de índice n (0 = marcar PENDING). */
  const updateData = (n: number) =>
    prisma.influencer.update.mock.calls[n][0].data;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(agora);

    prisma = {
      influencer: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    provider = { fetchProfile: jest.fn().mockResolvedValue(perfil) };
    igImages = { storeFromProfile: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn((_k: string, def: string) => def) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: INSTAGRAM_PROVIDER, useValue: provider },
        // Guardar imagem é best-effort e tem testes próprios — aqui só não
        // pode atrapalhar o contrato de staleness/falha do sync.
        { provide: IgImageService, useValue: igImages },
      ],
    }).compile();

    service = module.get(InstagramSyncService);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ─── Guardas de entrada ───────────────────────────────────────────────────

  describe('quando não há o que buscar', () => {
    it('não chama o provedor se a influencer não existe', async () => {
      prisma.influencer.findUnique.mockResolvedValue(null);

      await service.refresh('inf-inexistente');

      expect(provider.fetchProfile).not.toHaveBeenCalled();
      expect(prisma.influencer.update).not.toHaveBeenCalled();
    });

    it('não chama o provedor se a influencer não tem handle', async () => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({ instagramHandle: null }),
      );

      await service.refresh('inf-1');

      expect(provider.fetchProfile).not.toHaveBeenCalled();
    });
  });

  // ─── Staleness ────────────────────────────────────────────────────────────

  describe('staleness (sem force)', () => {
    it('pula a busca quando o dado está fresco e o último fetch deu OK', async () => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({
          igFetchStatus: IgFetchStatus.OK,
          igFetchedAt: new Date(agora.getTime() - 60_000), // 1 min atrás
        }),
      );

      await service.refresh('inf-1');

      expect(provider.fetchProfile).not.toHaveBeenCalled();
      expect(prisma.influencer.update).not.toHaveBeenCalled();
    });

    it('busca de novo quando o dado passou da janela de validade', async () => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({
          igFetchStatus: IgFetchStatus.OK,
          igFetchedAt: new Date(agora.getTime() - 25 * 3_600_000), // 25h atrás
        }),
      );

      await service.refresh('inf-1');

      expect(provider.fetchProfile).toHaveBeenCalledWith('anafit');
    });

    // FAILED nunca é "fresco": senão uma falha recente bloquearia a próxima
    // tentativa automática por 24h.
    it('busca de novo quando o último estado foi FAILED, mesmo recente', async () => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({
          igFetchStatus: IgFetchStatus.FAILED,
          igFetchedAt: new Date(agora.getTime() - 60_000),
        }),
      );

      await service.refresh('inf-1');

      expect(provider.fetchProfile).toHaveBeenCalled();
    });

    it('respeita a janela configurada em vez do default de 24h', async () => {
      config.get.mockImplementation((k: string, def: string) =>
        k === 'IG_FETCH_STALENESS_HOURS' ? '1' : def,
      );
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({
          igFetchStatus: IgFetchStatus.OK,
          igFetchedAt: new Date(agora.getTime() - 2 * 3_600_000), // 2h atrás
        }),
      );

      await service.refresh('inf-1');

      expect(provider.fetchProfile).toHaveBeenCalled();
    });

    it('force ignora a janela e busca mesmo com dado fresco', async () => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({
          igFetchStatus: IgFetchStatus.OK,
          igFetchedAt: new Date(agora.getTime() - 60_000),
        }),
      );

      await service.refresh('inf-1', { force: true });

      expect(provider.fetchProfile).toHaveBeenCalled();
    });
  });

  // ─── Caminho feliz ────────────────────────────────────────────────────────

  describe('sucesso', () => {
    beforeEach(() => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({ igFetchStatus: null }),
      );
    });

    it('marca PENDING antes de buscar (é o que a marca vê como "carregando")', async () => {
      await service.refresh('inf-1');

      expect(updateData(0)).toEqual({ igFetchStatus: IgFetchStatus.PENDING });
    });

    it('grava seguidores, foto, posts, engajamento e carimba OK', async () => {
      await service.refresh('inf-1');

      expect(updateData(1)).toMatchObject({
        followersCount: 10_000,
        igProfilePicUrl: perfil.profilePicUrl,
        igFetchStatus: IgFetchStatus.OK,
        igFetchedAt: agora,
      });
      // Média por post, não soma: (400 + 600) / 2 = 500 interações médias;
      // 500 / 10000 * 100 = 5%. Somar daria 10% e inflaria o número que a
      // marca usa pra decidir.
      expect(updateData(1).igEngagementRate).toBeCloseTo(5);
    });

    it('normaliza @ no handle antes de chamar o provedor', async () => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({ instagramHandle: '@@anafit', igFetchStatus: null }),
      );

      await service.refresh('inf-1');

      expect(provider.fetchProfile).toHaveBeenCalledWith('anafit');
    });
  });

  // ─── Falha ────────────────────────────────────────────────────────────────

  describe('falha do provedor', () => {
    beforeEach(() => {
      prisma.influencer.findUnique.mockResolvedValue(
        influencerNoBanco({ igFetchStatus: null }),
      );
      provider.fetchProfile.mockRejectedValue(new Error('RapidAPI 503'));
    });

    it('não propaga o erro (o chamador é fire-and-forget)', async () => {
      await expect(service.refresh('inf-1')).resolves.toBeUndefined();
    });

    it('marca FAILED e carimba a tentativa — é o que sustenta o cooldown', async () => {
      await service.refresh('inf-1');

      expect(updateData(1)).toEqual({
        igFetchStatus: IgFetchStatus.FAILED,
        igFetchedAt: agora,
      });
    });

    it('PRESERVA o último valor bom: não escreve seguidores, foto nem posts', async () => {
      await service.refresh('inf-1');

      const data = updateData(1);
      expect(data).not.toHaveProperty('followersCount');
      expect(data).not.toHaveProperty('igProfilePicUrl');
      expect(data).not.toHaveProperty('igRecentPosts');
      expect(data).not.toHaveProperty('igEngagementRate');
    });

    it('registra o motivo real da falha, não um stack genérico', async () => {
      const erro = jest.spyOn(service['logger'], 'error');

      await service.refresh('inf-1');

      expect(erro).toHaveBeenCalledWith(
        expect.stringContaining('RapidAPI 503'),
      );
    });
  });
});
