/**
 * Regra inviolável (CLAUDE.md): guards em TODA rota autenticada. Mesmo padrão
 * de `auth.controller.guards.spec.ts` — lê a metadata que @UseGuards grava,
 * sem depender de reler o controller na mão a cada rota nova.
 */
import { InfluencersController } from './influencers.controller';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

const GUARDS_KEY = '__guards__';

const getClassGuards = (): unknown[] =>
  (Reflect.getMetadata(GUARDS_KEY, InfluencersController) as
    | unknown[]
    | undefined) ?? [];

const getMethodGuards = (method: keyof InfluencersController): unknown[] =>
  (Reflect.getMetadata(GUARDS_KEY, InfluencersController.prototype[method]) as
    | unknown[]
    | undefined) ?? [];

describe('InfluencersController — guard em rota autenticada', () => {
  it('exige JwtAuthGuard na classe inteira', () => {
    expect(getClassGuards()).toContain(JwtAuthGuard);
  });

  it.each(['getMe', 'updateMe', 'exportMyData'] as const)(
    'exige RolesGuard (INFLUENCER) em %s',
    (method) => {
      expect(getMethodGuards(method)).toContain(RolesGuard);
    },
  );
});
