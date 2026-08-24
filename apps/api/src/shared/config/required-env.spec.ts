import { assertRequiredEnv, REQUIRED_ENV_IN_PRODUCTION } from './required-env';

/**
 * Guarda contra a classe de bug que derrubou a candidatura em produção
 * (2026-08-24): variável de ambiente lida com `getOrThrow` no MEIO de um
 * request. Ausente, ela não impede o boot — ela explode em 500 na hora exata
 * em que alguém usa o produto, e só naquele caminho.
 *
 * O caso real: `FRONTEND_URL` faltava no Railway, então a 1ª candidatura de
 * cada creator nova respondia 500 (depois de já ter criado a conta), e só a
 * 2ª tentativa passava.
 */

const completeProdEnv = (): Record<string, string> =>
  Object.fromEntries(REQUIRED_ENV_IN_PRODUCTION.map((k) => [k, 'valor']));

describe('assertRequiredEnv', () => {
  it('em produção com todas as obrigatórias presentes, não lança', () => {
    expect(() =>
      assertRequiredEnv({ NODE_ENV: 'production', ...completeProdEnv() }),
    ).not.toThrow();
  });

  it('em produção sem FRONTEND_URL, lança citando a variável', () => {
    const env = completeProdEnv();
    delete env.FRONTEND_URL;

    expect(() => assertRequiredEnv({ NODE_ENV: 'production', ...env })).toThrow(
      /FRONTEND_URL/,
    );
  });

  it('trata string vazia e só-espaços como ausente', () => {
    expect(() =>
      assertRequiredEnv({
        NODE_ENV: 'production',
        ...completeProdEnv(),
        FRONTEND_URL: '   ',
      }),
    ).toThrow(/FRONTEND_URL/);
  });

  it('lista TODAS as ausentes de uma vez, não só a primeira', () => {
    const env = completeProdEnv();
    delete env.FRONTEND_URL;
    delete env.JWT_ACCESS_EXPIRES_IN;

    // Descobrir uma variável por deploy quebrado é o pior jeito de descobrir.
    expect(() => assertRequiredEnv({ NODE_ENV: 'production', ...env })).toThrow(
      /FRONTEND_URL[\s\S]*JWT_ACCESS_EXPIRES_IN|JWT_ACCESS_EXPIRES_IN[\s\S]*FRONTEND_URL/,
    );
  });

  it('fora de produção, não lança mesmo sem nenhuma variável', () => {
    // Dev/teste rodam com .env parcial de propósito — travar o boot local
    // por causa disso só ensinaria a ignorar o erro.
    expect(() => assertRequiredEnv({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertRequiredEnv({})).not.toThrow();
  });

  it('cobre as variáveis lidas em tempo de request', () => {
    // Regressão: estas são lidas com getOrThrow DENTRO de um handler, então
    // a ausência delas não aparece no boot — só num 500 em produção.
    // creators.service (link do claim) e auth.service (assinatura do JWT).
    expect(REQUIRED_ENV_IN_PRODUCTION).toEqual(
      expect.arrayContaining([
        'FRONTEND_URL',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_ACCESS_EXPIRES_IN',
        'JWT_REFRESH_EXPIRES_IN',
      ]),
    );
  });
});
