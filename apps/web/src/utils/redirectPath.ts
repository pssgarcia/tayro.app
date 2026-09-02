import type { AuthUser } from '../stores/auth.store';

export function redirectPath(role: AuthUser['role']): string {
  if (role === 'BRAND') return '/brand';
  if (role === 'INFLUENCER') return '/influencer';
  return '/';
}
