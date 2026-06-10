import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Injeta Bearer token em toda requisição autenticada
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 handler — NUNCA usa window.location (causaria reload → loop de refresh)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? '';

    // /auth/refresh e /auth/login estão ISENTOS:
    // • Um 401 em /auth/refresh = "sem sessão ativa" — caminho normal.
    //   O bootstrap no AppShell já chama clearAuth() no .catch().
    // • Redirecionar aqui causaria loop (reload → refresh → 401 → reload...).
    const isAuthEndpoint = url.includes('/auth/');

    if (!isAuthEndpoint && err.response?.status === 401) {
      // Token expirado numa rota protegida → limpa sessão.
      // Os guards (BrandGuard) redirecionam para /login na próxima renderização
      // via <Navigate> do React Router — sem reload de página.
      useAuthStore.getState().clearAuth();
    }

    return Promise.reject(err);
  },
);
