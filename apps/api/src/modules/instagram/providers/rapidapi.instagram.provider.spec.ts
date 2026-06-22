import { ConfigService } from '@nestjs/config';
import { RapidApiInstagramProvider } from './rapidapi.instagram.provider';
import { InstagramFetchError } from './instagram-fetch.error';

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
function makeConfig(): ConfigService {
  return {
    getOrThrow: (key: string) =>
      ({
        RAPIDAPI_KEY: 'ca1ad4e75mshe6fe7ff3e6c1114p138a27jsn83a27e01f026',
        RAPIDAPI_HOST: 'instagram-best-experience.p.rapidapi.com',
        RAPIDAPI_BASE_URL: 'https://instagram-best-experience.p.rapidapi.com',
      })[key],
    get: (_key: string, def?: string) => def,
  } as unknown as ConfigService;
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

    const provider = new RapidApiInstagramProvider(makeConfig());
    const result = await provider.fetchProfile('pitringym');

    expect(result).toEqual({
      followers: 990,
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

    const provider = new RapidApiInstagramProvider(makeConfig());
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

    const provider = new RapidApiInstagramProvider(makeConfig());
    const result = await provider.fetchProfile('pitringym');

    expect(result).toEqual({ followers: 990, recentPosts: [] });
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

    const provider = new RapidApiInstagramProvider(makeConfig());
    const result = await provider.fetchProfile('pitringym');

    expect(result).toEqual({ followers: 990, recentPosts: [] });
  });

  it('profile falha nas 2 tentativas → lança InstagramFetchError', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const provider = new RapidApiInstagramProvider(makeConfig());

    await expect(provider.fetchProfile('pitringym')).rejects.toThrow(
      InstagramFetchError,
    );
  });
});
