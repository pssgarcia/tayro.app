import type { IgPost } from './instagram.types';

/**
 * Calcula taxa de engajamento como percentual (ex: 3.5 = 3,5%).
 * Retorna null se não houver posts ou followers = 0 (guard contra divisão por zero).
 */
export function calcEngagementRate(
  posts: IgPost[],
  followers: number,
): number | null {
  if (followers === 0 || posts.length === 0) return null;
  const totalInteractions = posts.reduce(
    (sum, p) => sum + p.likes + p.comments,
    0,
  );
  const avgInteractions = totalInteractions / posts.length;
  return Math.round((avgInteractions / followers) * 100 * 10) / 10;
}
