import type { ConfigService } from '@nestjs/config';
import type {
  InstagramProvider,
  InstagramProfile,
  IgPost,
} from '../instagram.types';
import { InstagramFetchError } from './instagram-fetch.error';

// ---------------------------------------------------------------------------
// Shapes brutos da API (instagram-best-experience).
// Versões enxutas — só os campos que consumimos. O resto do JSON é ruído.
// ---------------------------------------------------------------------------

interface RawProfile {
  pk: number;
  follower_count?: number;
  profile_pic_url?: string;
  hd_profile_pic_url_info?: { url?: string };
  [key: string]: unknown;
}

interface RawFeedItem {
  code?: string;
  like_count?: number;
  comment_count?: number;
  image_versions2?: {
    candidates?: Array<{ url?: string }>;
  };
}

interface RawFeed {
  items?: RawFeedItem[];
}

// 3 tentativas: imediata, depois +800ms, depois +2s. Duas tentativas coladas
// (sem espera) caem exatamente no mesmo problema quando a falha é transiente
// (rate limit momentâneo, soluço de rede) — o backoff dá tempo de passar.
// Roda em background (setImmediate, fire-and-forget); a latência extra não
// afeta a resposta HTTP da creator, só o tempo até a marca ver o resultado
// (ainda bem dentro do teto de ~45s do poll-while-PENDING).
const PROFILE_RETRY_DELAYS_MS = [0, 800, 2000];

export class RapidApiInstagramProvider implements InstagramProvider {
  private readonly apiKey: string;
  private readonly apiHost: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('RAPIDAPI_KEY');
    this.apiHost = config.getOrThrow<string>('RAPIDAPI_HOST');
    this.baseUrl = config.getOrThrow<string>('RAPIDAPI_BASE_URL');
    this.timeoutMs = parseInt(
      config.get<string>('IG_FETCH_TIMEOUT_MS', '10000'),
      10,
    );
  }

  async fetchProfile(handle: string): Promise<InstagramProfile> {
    // 1) /profile → followers + pk (numérico, exigido pelo /feed)
    const profile = await this.getProfile(handle);
    // 2) /feed → posts recentes. Best-effort: conta privada/erro → sem posts,
    //    mas ainda retornamos os followers (não jogamos a busca inteira fora).
    const feed = await this.getFeed(profile.pk);
    return this.toProfile(profile, feed);
  }

  // ─── Internos ────────────────────────────────────────────────────────────────

  /** Profile é obrigatório: 3 tentativas com backoff, depois lança (sem vazar detalhe interno). */
  private async getProfile(handle: string): Promise<RawProfile> {
    const url = `${this.baseUrl}/profile?username=${encodeURIComponent(handle)}`;
    for (const delayMs of PROFILE_RETRY_DELAYS_MS) {
      if (delayMs > 0) await this.sleep(delayMs);
      try {
        return (await this.fetchJson(url)) as RawProfile;
      } catch {
        // tenta de novo
      }
    }
    throw new InstagramFetchError(
      `Failed to fetch Instagram profile for @${handle} after ${PROFILE_RETRY_DELAYS_MS.length} attempts`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Feed é best-effort: falha/privado → lista vazia, nunca lança. */
  private async getFeed(pk: number): Promise<RawFeed> {
    const url = `${this.baseUrl}/feed?user_id=${encodeURIComponent(String(pk))}`;
    try {
      return (await this.fetchJson(url)) as RawFeed;
    } catch {
      return { items: [] };
    }
  }

  private toProfile(profile: RawProfile, feed: RawFeed): InstagramProfile {
    const followers = profile.follower_count ?? 0;
    const profilePicUrl =
      profile.hd_profile_pic_url_info?.url ?? profile.profile_pic_url ?? null;
    const recentPosts: IgPost[] = (feed.items ?? []).map((item) => ({
      url: `https://instagram.com/p/${item.code}/`,
      thumbnail: item.image_versions2?.candidates?.[0]?.url ?? '',
      likes: item.like_count ?? 0,
      comments: item.comment_count ?? 0,
    }));
    return { followers, recentPosts, profilePicUrl };
  }

  /** GET autenticado com timeout via AbortController. Lança se !res.ok. */
  private async fetchJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.apiHost,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new InstagramFetchError(`API returned HTTP ${res.status}`);
      }

      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}
