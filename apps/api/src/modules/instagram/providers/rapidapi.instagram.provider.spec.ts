import { ConfigService } from '@nestjs/config';
import { RapidApiInstagramProvider } from './rapidapi.instagram.provider';
import { InstagramFetchError } from './instagram-fetch.error';
import { IgProfileCache } from '../ig-profile-cache';

// ─── Fixtures ───────────────────────────────────────────────────────────────────
// Versões enxutas das respostas REAIS da API (instagram-best-experience).
// Só os campos que consumimos — o resto do JSON gigante é ruído.

const profileResponse = {
  pk: 1327010553,
  username: 'pitringym',
  follower_count: 990,
  is_private: false,
  profile_pic_url: 'https://cdn.example/pic_150.jpg',
  hd_profile_pic_url_info: { url: 'https://cdn.example/pic_hd.jpg' },
};

const feedResponse = {
  items: [
    {
      code: 'DZidf8Ttw1B',
      media_type: 2,
      like_count: 605,
      comment_count: 23,
      image_versions2: {
        candidates: [
          { url: 'https://cdn.example/thumb.jpg', width: 480, height: 853 },
        ],
      },
      caption: { text: '#gym #aesthetics #fitness' },
    },
  ],
};

// ConfigService falso — só responde as 4 chaves que o provider lê no construtor.
// A chave é FALSA de propósito: nenhum teste aqui faz rede (o `fetch` é
// mockado), então uma chave real não acrescentaria nada — e uma vez commitada,
// vaza para sempre no histórico do git. Aconteceu: a chave de produção esteve
// neste arquivo até 2026-08-24 e precisou ser rotacionada.
function makeConfig(): ConfigService {
  return {
    getOrThrow: (key: string) =>
      ({
        RAPIDAPI_KEY: 'chave-falsa-de-teste',
        RAPIDAPI_HOST: 'instagram-best-experience.p.rapidapi.com',
        RAPIDAPI_BASE_URL: 'https://instagram-best-experience.p.rapidapi.com',
      })[key],
    get: (_key: string, def?: string) => def,
  } as unknown as ConfigService;
}

// Cache novo a cada chamada — testes de fetchProfile/checkHandle "puros" (que
// não testam reaproveitamento) não devem se afetar por estado de um teste
// anterior. Testes de reaproveitamento passam o cache deles explicitamente.
function makeProvider(
  config: ConfigService,
  cache = new IgProfileCache(config),
): RapidApiInstagramProvider {
  return new RapidApiInstagramProvider(config, cache);
}

describe('RapidApiInstagramProvider', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('mapeia profile + feed para InstagramProfile', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(profileResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(feedResponse),
      });

    const provider = makeProvider(makeConfig());
    const result = await provider.fetchProfile('pitringym');

    expect(result).toEqual({
      followers: 990,
      profilePicUrl: 'https://cdn.example/pic_hd.jpg',
      recentPosts: [
        {
          url: 'https://instagram.com/p/DZidf8Ttw1B/',
          thumbnail: 'https://cdn.example/thumb.jpg',
          likes: 605,
          comments: 23,
        },
      ],
    });
  });

  it('usa o pk do /profile como user_id na chamada do /feed', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(profileResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(feedResponse),
      });

    const provider = makeProvider(makeConfig());
    await provider.fetchProfile('pitringym');

    const firstUrl = fetchMock.mock.calls[0][0] as string;
    const secondUrl = fetchMock.mock.calls[1][0] as string;

    expect(firstUrl).toContain('/profile?username=pitringym');
    expect(secondUrl).toContain('/feed?user_id=1327010553');
  });

  it('feed falha (HTTP 500) → followers preservados, recentPosts vazio', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(profileResponse),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const provider = makeProvider(makeConfig());
    const result = await provider.fetchProfile('pitringym');

    expect(result).toEqual({
      followers: 990,
      profilePicUrl: 'https://cdn.example/pic_hd.jpg',
      recentPosts: [],
    });
  });

  it('feed vazio (conta privada) → followers preservados, recentPosts vazio', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(profileResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

    const provider = makeProvider(makeConfig());
    const result = await provider.fetchProfile('pitringym');

    expect(result).toEqual({
      followers: 990,
      profilePicUrl: 'https://cdn.example/pic_hd.jpg',
      recentPosts: [],
    });
  });

  it('sem hd_profile_pic_url_info → usa profile_pic_url como fallback', async () => {
    const profileSemHd = {
      pk: 1327010553,
      username: 'pitringym',
      follower_count: 990,
      is_private: false,
      profile_pic_url: 'https://cdn.example/pic_150.jpg',
      // hd_profile_pic_url_info ausente — simula conta que não retorna campo HD
    };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(profileSemHd),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

    const provider = makeProvider(makeConfig());
    const result = await provider.fetchProfile('pitringym');

    expect(result.profilePicUrl).toBe('https://cdn.example/pic_150.jpg');
  });

  it('profile falha nas 3 tentativas → lança InstagramFetchError', async () => {
    jest.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const provider = makeProvider(makeConfig());

      // Anexa a assertion IMEDIATAMENTE (antes de avançar os timers), senão a
      // rejeição fica sem handler por um instante e o Jest acusa unhandled rejection.
      const assertion = expect(
        provider.fetchProfile('pitringym'),
      ).rejects.toThrow(InstagramFetchError);
      // Avança os 2 backoffs (800ms + 2000ms) sem esperar de verdade.
      await jest.advanceTimersByTimeAsync(3000);
      await assertion;

      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('profile falha 2x e recupera na 3ª tentativa (backoff dá tempo do transiente passar)', async () => {
    jest.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(profileResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(feedResponse),
        });

      const provider = makeProvider(makeConfig());

      const assertion = expect(
        provider.fetchProfile('pitringym'),
      ).resolves.toMatchObject({ followers: 990 });
      await jest.advanceTimersByTimeAsync(3000);
      await assertion;

      // 3 chamadas de /profile + 1 de /feed
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('checkHandle', () => {
    it('devolve FOUND numa resposta conclusiva com pk', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileResponse),
      });

      const provider = makeProvider(makeConfig());
      await expect(provider.checkHandle('pitringym')).resolves.toBe('FOUND');
    });

    it('devolve NOT_FOUND num 404 com o corpo de erro conclusivo do Instagram', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: "We're sorry, we couldn't find that.",
          }),
      });

      const provider = makeProvider(makeConfig());
      await expect(provider.checkHandle('naoexiste')).resolves.toBe(
        'NOT_FOUND',
      );
    });

    it('devolve UNKNOWN num 404 SEM corpo de erro conclusivo — pode ser conta real que a API não consegue ler (ex.: ramondinopro em prod)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not authorized' }),
      });

      const provider = makeProvider(makeConfig());
      await expect(provider.checkHandle('ramondinopro')).resolves.toBe(
        'UNKNOWN',
      );
    });

    it('devolve UNKNOWN num 404 com corpo não-JSON', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      });

      const provider = makeProvider(makeConfig());
      await expect(provider.checkHandle('ramondinopro')).resolves.toBe(
        'UNKNOWN',
      );
    });

    it('devolve UNKNOWN em erro do provedor (5xx) — nunca NOT_FOUND', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

      const provider = makeProvider(makeConfig());
      await expect(provider.checkHandle('pitringym')).resolves.toBe('UNKNOWN');
    });

    it('devolve UNKNOWN quando o fetch lança (timeout/rede) — nunca NOT_FOUND', async () => {
      fetchMock.mockRejectedValueOnce(new Error('aborted'));

      const provider = makeProvider(makeConfig());
      await expect(provider.checkHandle('pitringym')).resolves.toBe('UNKNOWN');
    });

    it('devolve UNKNOWN numa resposta ok sem pk numérico — ambíguo não afirma nada', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ username: 'pitringym' }),
      });

      const provider = makeProvider(makeConfig());
      await expect(provider.checkHandle('pitringym')).resolves.toBe('UNKNOWN');
    });

    it('não faz retry — uma tentativa só, mesmo em falha', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

      const provider = makeProvider(makeConfig());
      await provider.checkHandle('pitringym');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('verificar o mesmo @ duas vezes seguidas consulta o provedor uma vez só', async () => {
      const config = makeConfig();
      const cache = new IgProfileCache(config);
      const provider = makeProvider(config, cache);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileResponse),
      });
      const primeira = await provider.checkHandle('pitringym');
      const segunda = await provider.checkHandle('pitringym');

      expect(primeira).toBe('FOUND');
      expect(segunda).toBe('FOUND');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('verificar o mesmo @ conclusivamente inexistente duas vezes seguidas também consulta uma vez só', async () => {
      const config = makeConfig();
      const cache = new IgProfileCache(config);
      const provider = makeProvider(config, cache);

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: "We're sorry, we couldn't find that.",
          }),
      });
      const primeira = await provider.checkHandle('naoexiste');
      const segunda = await provider.checkHandle('naoexiste');

      expect(primeira).toBe('NOT_FOUND');
      expect(segunda).toBe('NOT_FOUND');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('reaproveitamento entre checkHandle e fetchProfile', () => {
    it('sincronizar logo após verificar o mesmo @ NÃO repete a chamada de perfil — só o feed é buscado', async () => {
      const config = makeConfig();
      const cache = new IgProfileCache(config);
      const provider = makeProvider(config, cache);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileResponse),
      });
      await expect(provider.checkHandle('pitringym')).resolves.toBe('FOUND');
      expect(fetchMock).toHaveBeenCalledTimes(1); // só o /profile da verificação

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(feedResponse),
      });
      const result = await provider.fetchProfile('pitringym');

      // Prova a economia por mutação: se o reaproveitamento fosse removido
      // (fetchProfile sempre buscando o perfil de novo), este total subiria
      // pra 4 (1 verificação + 3 tentativas de perfil + 1 feed), não 2.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.followers).toBe(990);
    });

    it('atualização manual (force) ignora o reaproveitamento e busca o perfil de novo', async () => {
      const config = makeConfig();
      const cache = new IgProfileCache(config);
      const provider = makeProvider(config, cache);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileResponse),
      });
      await provider.checkHandle('pitringym');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(profileResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(feedResponse),
        });
      await provider.fetchProfile('pitringym', { allowCached: false });

      // 1 (verificação) + 1 (perfil forçado) + 1 (feed) — o cache foi ignorado.
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('sincronizar um @ que a verificação confirmou inexistente termina em falha sem tocar o provedor de novo', async () => {
      const config = makeConfig();
      const cache = new IgProfileCache(config);
      const provider = makeProvider(config, cache);

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            status: 'error',
            error: "We're sorry, we couldn't find that.",
          }),
      });
      await expect(provider.checkHandle('naoexiste')).resolves.toBe(
        'NOT_FOUND',
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await expect(provider.fetchProfile('naoexiste')).rejects.toThrow(
        InstagramFetchError,
      );
      // Nenhuma chamada nova — nem tentativa de perfil, nem de feed.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('entrada expirada do cache não é reaproveitada', async () => {
      jest.useFakeTimers().setSystemTime(0);
      try {
        const config = makeConfig(); // TTL default 15min
        const cache = new IgProfileCache(config);
        const provider = makeProvider(config, cache);

        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(profileResponse),
        });
        await provider.checkHandle('pitringym');
        expect(fetchMock).toHaveBeenCalledTimes(1);

        jest.setSystemTime(16 * 60_000); // passa do TTL de 15min

        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(profileResponse),
        });
        await provider.checkHandle('pitringym');

        // Expirou: a segunda verificação teve que consultar o provedor de novo.
        expect(fetchMock).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
