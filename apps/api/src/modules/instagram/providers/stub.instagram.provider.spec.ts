import {
  StubInstagramProvider,
  STUB_HANDLE_NOT_FOUND_MARKER,
  STUB_HANDLE_UNKNOWN_MARKER,
} from './stub.instagram.provider';
import { InstagramFetchError } from './instagram-fetch.error';
import type { InstagramProvider } from '../instagram.types';

describe('StubInstagramProvider', () => {
  describe('checkHandle', () => {
    it('devolve FOUND pra handle comum', async () => {
      const provider = new StubInstagramProvider();
      await expect(provider.checkHandle('anafitness')).resolves.toBe('FOUND');
    });

    it(`devolve NOT_FOUND quando o handle contém "${STUB_HANDLE_NOT_FOUND_MARKER}"`, async () => {
      const provider = new StubInstagramProvider();
      await expect(
        provider.checkHandle(`perfil${STUB_HANDLE_NOT_FOUND_MARKER}`),
      ).resolves.toBe('NOT_FOUND');
    });

    it(`devolve UNKNOWN quando o handle contém "${STUB_HANDLE_UNKNOWN_MARKER}"`, async () => {
      const provider = new StubInstagramProvider();
      await expect(
        provider.checkHandle(`perfil${STUB_HANDLE_UNKNOWN_MARKER}`),
      ).resolves.toBe('UNKNOWN');
    });

    it('é determinístico — mesmo handle, mesmo desfecho sempre', async () => {
      const provider = new StubInstagramProvider();
      const first = await provider.checkHandle('anafitness');
      const second = await provider.checkHandle('anafitness');
      expect(first).toBe(second);
    });
  });

  describe('fetchProfile', () => {
    it('resolve com dados determinísticos pra handle comum', async () => {
      const provider = new StubInstagramProvider();
      const profile = await provider.fetchProfile('anafitness');
      expect(profile.followers).toBeGreaterThan(0);
      expect(profile.recentPosts.length).toBeGreaterThan(0);
    });

    it(`rejeita com InstagramFetchError quando o handle contém "${STUB_HANDLE_NOT_FOUND_MARKER}" — espelha a falha real de sincronizar um @ já confirmado inexistente`, async () => {
      const provider = new StubInstagramProvider();
      await expect(
        provider.fetchProfile(`perfil${STUB_HANDLE_NOT_FOUND_MARKER}`),
      ).rejects.toThrow(InstagramFetchError);
    });

    it('satisfaz a interface InstagramProvider mesmo chamado com a opção allowCached', async () => {
      // Tipado como a interface, não a classe concreta: prova que o stub
      // (com menos parâmetros) continua estruturalmente compatível com quem
      // consome via InstagramProvider (InstagramSyncService, por exemplo).
      const provider: InstagramProvider = new StubInstagramProvider();
      await expect(
        provider.fetchProfile('anafitness', { allowCached: false }),
      ).resolves.toBeDefined();
    });
  });
});
