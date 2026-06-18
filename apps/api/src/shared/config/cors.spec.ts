import { resolveAllowedOrigins } from './cors';

describe('resolveAllowedOrigins', () => {
  it('divide ALLOWED_ORIGINS por vírgula e remove espaços', () => {
    const origins = resolveAllowedOrigins({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://tayro-app.vercel.app, https://tayro.app',
    });
    expect(origins).toEqual([
      'https://tayro-app.vercel.app',
      'https://tayro.app',
    ]);
  });

  it('ignora entradas vazias (vírgulas a mais)', () => {
    const origins = resolveAllowedOrigins({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://a.com,,https://b.com,',
    });
    expect(origins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('em produção SEM ALLOWED_ORIGINS, lança erro explícito (fail-fast)', () => {
    expect(() => resolveAllowedOrigins({ NODE_ENV: 'production' })).toThrow(
      /ALLOWED_ORIGINS/,
    );
  });

  it('em produção com ALLOWED_ORIGINS só de espaços/vírgulas, lança erro', () => {
    expect(() =>
      resolveAllowedOrigins({ NODE_ENV: 'production', ALLOWED_ORIGINS: ' , ' }),
    ).toThrow(/ALLOWED_ORIGINS/);
  });

  it('em dev sem ALLOWED_ORIGINS, usa o default de localhost', () => {
    const origins = resolveAllowedOrigins({ NODE_ENV: 'development' });
    expect(origins).toEqual(['http://localhost:5173']);
  });

  it('em dev com ALLOWED_ORIGINS definido, respeita a allow-list', () => {
    const origins = resolveAllowedOrigins({
      NODE_ENV: 'development',
      ALLOWED_ORIGINS: 'http://localhost:3000',
    });
    expect(origins).toEqual(['http://localhost:3000']);
  });
});
