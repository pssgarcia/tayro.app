import { describe, it, expect, beforeEach } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { api } from './api';
import { useAuthStore } from '../stores/auth.store';

// Regressão do bug de 2026-09-04: DeleteAccountModal chamava DELETE
// /influencers/me, e um 401 de SENHA INCORRETA (erro de negócio, não token
// expirado) caía no ramo "sessão expirou" do interceptor — a creator via a
// tela deslogar em vez de ler "Senha incorreta". A regra do interceptor só é
// segura enquanto TODO 401 fora de /auth/* significa token expirado; um 401
// de negócio em rota não-auth (ex.: senha incorreta) quebra essa premissa.
// Por isso changePassword/changeEmail/deleteAccount vivem em /auth/*.

function rejectingAdapter(status: number) {
  return async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const err = new Error('Request failed') as Error & {
      isAxiosError: true;
      config: AxiosRequestConfig;
      response: AxiosResponse;
    };
    err.isAxiosError = true;
    err.config = config;
    err.response = {
      status,
      data: {},
      statusText: '',
      headers: {},
      config,
    } as AxiosResponse;
    throw err;
  };
}

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'tok-1',
    user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' },
    isInitialized: true,
  });
});

describe('api — interceptor de 401', () => {
  it('401 fora de /auth/* limpa a sessão (token expirado numa rota protegida)', async () => {
    await expect(
      api.get('/influencers/me', { adapter: rejectingAdapter(401) }),
    ).rejects.toBeTruthy();

    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  // A asserção que teria pego o bug: um 401 de erro de NEGÓCIO (senha
  // incorreta) em /auth/delete-account não pode derrubar a sessão.
  it('401 em /auth/* NÃO limpa a sessão (pode ser erro de negócio, ex.: senha incorreta)', async () => {
    await expect(
      api.post('/auth/delete-account', {}, { adapter: rejectingAdapter(401) }),
    ).rejects.toBeTruthy();

    expect(useAuthStore.getState().accessToken).toBe('tok-1');
  });

  it('outros códigos de erro fora de /auth/* não limpam a sessão', async () => {
    await expect(
      api.get('/influencers/me', { adapter: rejectingAdapter(500) }),
    ).rejects.toBeTruthy();

    expect(useAuthStore.getState().accessToken).toBe('tok-1');
  });
});
