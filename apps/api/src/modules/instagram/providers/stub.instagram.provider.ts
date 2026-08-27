import { createHash } from 'node:crypto';
import type {
  InstagramProvider,
  InstagramProfile,
  HandleCheckResult,
} from '../instagram.types';
import { calcEngagementRate } from '../engagement.utils';
import { InstagramFetchError } from './instagram-fetch.error';

// Substrings reservadas pra dar ao dev os 3 desfechos da verificação de
// handle sem depender de cota real. Escolhidas pra não colidir com handle
// real plausível em teste (ninguém testa com @ contendo "naoexiste").
export const STUB_HANDLE_NOT_FOUND_MARKER = 'naoexiste';
export const STUB_HANDLE_UNKNOWN_MARKER = 'indeterminado';

export class StubInstagramProvider implements InstagramProvider {
  // Aceita menos parâmetros que a interface (allowCached) de propósito: o
  // stub é determinístico e não tem cache real pra reaproveitar/ignorar —
  // TS permite implementação com menos parâmetros que a assinatura opcional.
  fetchProfile(handle: string): Promise<InstagramProfile> {
    // Espelha o comportamento real: sincronizar um @ que a verificação já
    // apontou como inexistente termina em falha, não em dado inventado.
    if (handle.includes(STUB_HANDLE_NOT_FOUND_MARKER)) {
      return Promise.reject(
        new InstagramFetchError(`@${handle} não existe no Instagram (stub)`),
      );
    }

    const seed = this.seedFromHandle(handle);
    const followers = 1000 + Math.floor(this.rand(seed, 0) * 499000);
    const postCount = 8 + Math.floor(this.rand(seed, 1) * 5); // [8, 12]

    const recentPosts = Array.from({ length: postCount }, (_, i) => ({
      url: `https://instagram.com/${handle}/p/stub${i + 1}`,
      thumbnail: `https://picsum.photos/seed/${handle}${i}/300/300`,
      likes: Math.floor(this.rand(seed, i * 3 + 2) * followers * 0.08),
      comments: Math.floor(this.rand(seed, i * 3 + 3) * followers * 0.005),
    }));

    // Força pelo menos 1 like por post para que calcEngagementRate nunca retorne null
    const safePosts = recentPosts.map((p) => ({
      ...p,
      likes: Math.max(p.likes, 1),
      comments: Math.max(p.comments, 0),
    }));

    // engagementRate calculado pela mesma função compartilhada
    void calcEngagementRate(safePosts, followers);

    return Promise.resolve({
      followers,
      recentPosts: safePosts,
      profilePicUrl: null,
    });
  }

  checkHandle(handle: string): Promise<HandleCheckResult> {
    if (handle.includes(STUB_HANDLE_NOT_FOUND_MARKER)) {
      return Promise.resolve('NOT_FOUND');
    }
    if (handle.includes(STUB_HANDLE_UNKNOWN_MARKER)) {
      return Promise.resolve('UNKNOWN');
    }
    return Promise.resolve('FOUND');
  }

  private seedFromHandle(handle: string): number {
    const hex = createHash('md5').update(handle).digest('hex');
    return parseInt(hex.slice(0, 8), 16);
  }

  // LCG determinístico — mesmo seed + index => mesmo número [0, 1)
  private rand(seed: number, index: number): number {
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    return ((a * (seed + index * 37) + c) % m) / m;
  }
}
