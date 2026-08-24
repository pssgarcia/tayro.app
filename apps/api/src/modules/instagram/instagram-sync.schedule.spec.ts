/**
 * InstagramSyncService.scheduleRefresh — disparo em background.
 *
 * Antes de 2026-08-24 este disparo era um helper privado do CreatorsService, e
 * só a candidatura pública o chamava. Cadastro de creator e candidatura
 * autenticada nunca disparavam nada, então a creator que entrava por essas
 * portas ficava com `igFetchStatus = null` para sempre e a marca via "Dados do
 * Instagram indisponíveis" desde o primeiro segundo.
 *
 * Trazer o disparo para cá dá um dono único à regra: quem quer sincronizar
 * chama um método só, e a semântica de "não bloqueia e nunca derruba quem
 * chamou" vive num lugar testável em vez de replicada em cada serviço.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InstagramSyncService } from './instagram-sync.service';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { INSTAGRAM_PROVIDER } from './instagram.constants';
import { IgImageService } from './ig-image.service';

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe('InstagramSyncService.scheduleRefresh', () => {
  let service: InstagramSyncService;
  let refresh: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramSyncService,
        { provide: PrismaService, useValue: { influencer: {} } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: INSTAGRAM_PROVIDER, useValue: { fetchProfile: jest.fn() } },
        { provide: IgImageService, useValue: { storeFromProfile: jest.fn() } },
      ],
    }).compile();

    service = module.get(InstagramSyncService);
    refresh = jest.spyOn(service, 'refresh').mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('dispara o refresh do influencer informado', async () => {
    service.scheduleRefresh('inf-1');
    await flushMicrotasks();

    expect(refresh).toHaveBeenCalledWith('inf-1');
  });

  it('retorna antes do refresh rodar — não bloqueia a resposta HTTP', async () => {
    // A creator não pode esperar uma API externa para receber o 201.
    service.scheduleRefresh('inf-1');

    expect(refresh).not.toHaveBeenCalled();

    await flushMicrotasks(); // drena o agendamento antes do afterEach
  });

  it('falha do refresh é logada e não vira exceção para quem agendou', async () => {
    const logError = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);
    refresh.mockRejectedValue(new Error('RapidAPI fora do ar'));

    expect(() => service.scheduleRefresh('inf-1')).not.toThrow();
    await flushMicrotasks();

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('RapidAPI fora do ar'),
    );
  });
});
