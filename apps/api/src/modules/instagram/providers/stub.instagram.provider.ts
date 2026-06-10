import { createHash } from 'node:crypto';
import type { InstagramProvider, InstagramProfile } from '../instagram.types';
import { calcEngagementRate } from '../engagement.utils';

export class StubInstagramProvider implements InstagramProvider {
  async fetchProfile(handle: string): Promise<InstagramProfile> {
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

    return { followers, recentPosts: safePosts };
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
