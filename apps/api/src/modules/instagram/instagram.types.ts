export interface IgPost {
  url: string;
  thumbnail: string;
  likes: number;
  comments: number;
}

export interface InstagramProfile {
  followers: number;
  recentPosts: IgPost[];
  profilePicUrl: string | null;
}

/**
 * Desfecho da verificação de existência de um @. Só três, de propósito:
 * "não existe" SÓ é afirmado com resposta conclusiva do provedor — qualquer
 * ambiguidade (fora do ar, timeout, resposta estranha, teto de cota) vira
 * UNKNOWN, nunca NOT_FOUND. Ver specs/instagram-sync/spec.md.
 */
export type HandleCheckResult = 'FOUND' | 'NOT_FOUND' | 'UNKNOWN';

export interface FetchProfileOptions {
  /**
   * Default true. Quando true, o passo de PERFIL (não o feed) pode reaproveitar
   * uma consulta recente feita por checkHandle/fetchProfile pro mesmo handle.
   * A atualização manual (force) passa false de propósito — reaproveitar
   * contrariaria o motivo de existir um refresh manual.
   */
  allowCached?: boolean;
}

export interface InstagramProvider {
  fetchProfile(
    handle: string,
    options?: FetchProfileOptions,
  ): Promise<InstagramProfile>;

  /**
   * Verificação leve: só confirma se o @ existe, sem devolver dado de perfil
   * nenhum. Uma tentativa só (sem retry — tem gente esperando na tela).
   */
  checkHandle(handle: string): Promise<HandleCheckResult>;
}
