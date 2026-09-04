/**
 * Regra inviolável (CLAUDE.md): guards em TODA rota autenticada. Este teste
 * lê a metadata que @UseGuards grava no método (chave '__guards__') pra
 * travar isso como regressão — sem rede nenhuma até aqui, a única defesa
 * era reler o controller na mão.
 */
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

const GUARDS_KEY = '__guards__';

const getGuards = (method: keyof AuthController): unknown[] =>
  (Reflect.getMetadata(GUARDS_KEY, AuthController.prototype[method]) as
    | unknown[]
    | undefined) ?? [];

describe('AuthController — guard em rota autenticada', () => {
  it.each([
    'changePassword',
    'changeEmail',
    'logout',
    'deleteAccount',
  ] as const)('exige JwtAuthGuard em %s', (method) => {
    expect(getGuards(method)).toContain(JwtAuthGuard);
  });

  // deleteAccount é só INFLUENCER por ora (D-22) — os outros três valem pra
  // qualquer papel autenticado, então não carregam RolesGuard.
  it('exige RolesGuard em deleteAccount', () => {
    expect(getGuards('deleteAccount')).toContain(RolesGuard);
  });

  it.each(['changePassword', 'changeEmail', 'logout'] as const)(
    'NÃO exige RolesGuard em %s (vale pra BRAND e INFLUENCER)',
    (method) => {
      expect(getGuards(method)).not.toContain(RolesGuard);
    },
  );
});
