/**
 * Regra inviolável (CLAUDE.md): guards em TODA rota autenticada. Mesmo padrão
 * de `auth.controller.guards.spec.ts`.
 */
import { BrandsController } from './brands.controller';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

const GUARDS_KEY = '__guards__';

const getClassGuards = (): unknown[] =>
  (Reflect.getMetadata(GUARDS_KEY, BrandsController) as
    | unknown[]
    | undefined) ?? [];

const getMethodGuards = (method: keyof BrandsController): unknown[] =>
  (Reflect.getMetadata(GUARDS_KEY, BrandsController.prototype[method]) as
    | unknown[]
    | undefined) ?? [];

describe('BrandsController — guard em rota autenticada', () => {
  it('exige JwtAuthGuard na classe inteira', () => {
    expect(getClassGuards()).toContain(JwtAuthGuard);
  });

  it.each(['getMe', 'updateMe', 'exportMyData'] as const)(
    'exige RolesGuard (BRAND) em %s',
    (method) => {
      expect(getMethodGuards(method)).toContain(RolesGuard);
    },
  );
});
