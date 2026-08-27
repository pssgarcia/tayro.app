import type { ConfigService } from '@nestjs/config';

/**
 * Entrada guardada pra um handle: ou um perfil bruto (reaproveitável pelo
 * passo de perfil da sincronização), ou o veredito NOT_FOUND (pra que
 * sincronizar um @ já confirmado inexistente não bata no provedor de novo).
 * Nunca guarda UNKNOWN — indeterminado não é fato, não vale a pena persistir.
 */
export type IgProfileCacheEntry =
  | { kind: 'profile'; data: unknown }
  | { kind: 'not_found' };

interface StoredEntry {
  entry: IgProfileCacheEntry;
  expiresAt: number;
}

// Teto de entradas simultâneas — sem isso um bombardeio de handles distintos
// (verificação é rota pública) cresce o Map sem parar. Poda a mais antiga
// (FIFO) na escrita; não precisa ser LRU, só precisa ter teto.
export const IG_PROFILE_CACHE_MAX_ENTRIES = 500;

export class IgProfileCache {
  private readonly ttlMs: number;
  private readonly store = new Map<string, StoredEntry>();

  constructor(config: ConfigService) {
    const minutes = parseInt(
      config.get<string>('IG_PROFILE_CACHE_TTL_MINUTES', '15'),
      10,
    );
    this.ttlMs = minutes * 60_000;
  }

  get size(): number {
    return this.store.size;
  }

  get(handle: string): IgProfileCacheEntry | undefined {
    const stored = this.store.get(handle);
    if (!stored) return undefined;
    if (Date.now() >= stored.expiresAt) {
      this.store.delete(handle);
      return undefined;
    }
    return stored.entry;
  }

  set(handle: string, entry: IgProfileCacheEntry): void {
    if (
      !this.store.has(handle) &&
      this.store.size >= IG_PROFILE_CACHE_MAX_ENTRIES
    ) {
      const [oldestKey] = this.store.keys();
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(handle, { entry, expiresAt: Date.now() + this.ttlMs });
  }
}
