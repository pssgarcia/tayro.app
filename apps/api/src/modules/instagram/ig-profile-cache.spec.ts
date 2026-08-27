import { ConfigService } from '@nestjs/config';
import {
  IgProfileCache,
  IG_PROFILE_CACHE_MAX_ENTRIES,
} from './ig-profile-cache';

function makeConfig(ttlMinutes?: string): ConfigService {
  return {
    get: (_key: string, def?: string) => ttlMinutes ?? def,
  } as unknown as ConfigService;
}

describe('IgProfileCache', () => {
  it('devolve undefined pra handle nunca guardado', () => {
    const cache = new IgProfileCache(makeConfig());
    expect(cache.get('naoexiste123')).toBeUndefined();
  });

  it('guarda e devolve um perfil', () => {
    const cache = new IgProfileCache(makeConfig());
    cache.set('anafitness', { kind: 'profile', data: { pk: 1 } });
    expect(cache.get('anafitness')).toEqual({
      kind: 'profile',
      data: { pk: 1 },
    });
  });

  it('guarda e devolve o veredito not_found', () => {
    const cache = new IgProfileCache(makeConfig());
    cache.set('semconta', { kind: 'not_found' });
    expect(cache.get('semconta')).toEqual({ kind: 'not_found' });
  });

  it('expira após o TTL configurado', () => {
    jest.useFakeTimers().setSystemTime(0);
    try {
      const cache = new IgProfileCache(makeConfig('1')); // 1 minuto
      cache.set('anafitness', { kind: 'profile', data: { pk: 1 } });

      jest.setSystemTime(59_000);
      expect(cache.get('anafitness')).toBeDefined();

      jest.setSystemTime(61_000);
      expect(cache.get('anafitness')).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('não cresce sem limite com handles distintos — respeita o teto de entradas', () => {
    const cache = new IgProfileCache(makeConfig());

    for (let i = 0; i < IG_PROFILE_CACHE_MAX_ENTRIES + 50; i++) {
      cache.set(`handle${i}`, { kind: 'profile', data: { pk: i } });
    }

    expect(cache.size).toBeLessThanOrEqual(IG_PROFILE_CACHE_MAX_ENTRIES);
  });

  it('default de TTL é 15 minutos quando a env não está setada', () => {
    jest.useFakeTimers().setSystemTime(0);
    try {
      const cache = new IgProfileCache(makeConfig()); // sem override => default '15'
      cache.set('anafitness', { kind: 'profile', data: { pk: 1 } });

      jest.setSystemTime(14 * 60_000);
      expect(cache.get('anafitness')).toBeDefined();

      jest.setSystemTime(16 * 60_000);
      expect(cache.get('anafitness')).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
