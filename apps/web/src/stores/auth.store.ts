import { create } from 'zustand';

export type UserRole = 'BRAND' | 'INFLUENCER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** false enquanto o silent refresh do boot ainda não terminou */
  isInitialized: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  setAuth: (accessToken, user) => set({ accessToken, user, isInitialized: true }),
  clearAuth: () => set({ accessToken: null, user: null, isInitialized: true }),
}));
