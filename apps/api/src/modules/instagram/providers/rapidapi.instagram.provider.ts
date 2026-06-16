import type { ConfigService } from '@nestjs/config';
import type { InstagramProvider, InstagramProfile } from '../instagram.types';
import { InstagramFetchError } from './instagram-fetch.error';

// ---------------------------------------------------------------------------
// Shape esperado da resposta bruta do provider RapidAPI.
//
// Ao escolher o provider no RapidAPI (ex: "Instagram Scraper", "Instagram Data",
// etc.), atualize APENAS o método rawToProfile() abaixo com o mapeamento correto.
// Nenhum outro trecho do código precisa ser alterado.
//
// Campos comuns em providers de Instagram scraping (ajuste conforme o real):
// ---------------------------------------------------------------------------
interface RawApiResponse {
  // Exemplo de estrutura genérica — substitua pelos campos reais:
  // data?: {
  //   user?: {
  //     edge_followed_by?: { count: number };
  //     edge_owner_to_timeline_media?: {
  //       edges: Array<{
  //         node: {
  //           display_url: string;
  //           thumbnail_src?: string;
  //           edge_liked_by: { count: number };
  //           edge_media_to_comment: { count: number };
  //         };
  //       }>;
  //     };
  //   };
  // };
  [key: string]: unknown;
}

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
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const raw = await this.fetchRaw(handle);
        return this.rawToProfile(raw);
      } catch {
        // continua para a próxima tentativa
      }
    }
    // Nunca vaza detalhes internos do provider para camadas acima
    throw new InstagramFetchError(
      `Failed to fetch Instagram profile for @${handle} after 2 attempts`,
    );
  }

  // ─── Internos ────────────────────────────────────────────────────────────────

  private async fetchRaw(handle: string): Promise<RawApiResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // TODO: ajuste o path e query params conforme o provider escolhido no RapidAPI.
      // Exemplo: `${this.baseUrl}/user/info?username=${handle}`
      const url = `${this.baseUrl}/user?username=${encodeURIComponent(handle)}`;

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

      return res.json() as Promise<RawApiResponse>;
    } finally {
      clearTimeout(timer);
    }
  }

  private rawToProfile(raw: RawApiResponse): InstagramProfile {
    // TODO: mapeie os campos do provider escolhido aqui.
    //
    // Exemplo genérico (substitua pelos campos reais do provider):
    //
    // const user = (raw as any).data?.user;
    // const followers: number = user?.edge_followed_by?.count ?? 0;
    // const edges = user?.edge_owner_to_timeline_media?.edges ?? [];
    // const recentPosts: IgPost[] = edges.map((e: any) => ({
    //   url: e.node.display_url,
    //   thumbnail: e.node.thumbnail_src ?? e.node.display_url,
    //   likes: e.node.edge_liked_by?.count ?? 0,
    //   comments: e.node.edge_media_to_comment?.count ?? 0,
    // }));
    // return { followers, recentPosts };

    void (raw satisfies RawApiResponse); // mantém a variável usada
    throw new InstagramFetchError(
      'RapidApiInstagramProvider.rawToProfile() não implementado — escolha o provider no RapidAPI e preencha o mapeamento acima',
    );
  }
}
