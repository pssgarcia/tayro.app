import { describe, it, expect } from 'vitest';
import { redirectPath } from './redirectPath';

describe('redirectPath', () => {
  it('BRAND vai para /brand', () => {
    expect(redirectPath('BRAND')).toBe('/brand');
  });

  it('INFLUENCER vai para /influencer', () => {
    expect(redirectPath('INFLUENCER')).toBe('/influencer');
  });

  it('qualquer outro papel cai na raiz', () => {
    expect(redirectPath('ADMIN')).toBe('/');
  });
});
