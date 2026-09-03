/**
 * Regra inviolável (CLAUDE.md): guards em TODA rota autenticada — e aqui o
 * papel importa tanto quanto a autenticação. Duas trocas de papel seriam
 * silenciosas e graves: uma creator com acesso a `create`/`update` escreveria
 * o próprio histórico (o diferencial nº 2 morre no dia em que isso for
 * possível), e uma marca com acesso a `setVisibility` decidiria o que aparece
 * na página de outra pessoa. O teste lê a metadata que os decorators gravam.
 */
import { PartnershipResultsController } from './partnership-results.controller';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';

const GUARDS_KEY = '__guards__';
const ROLES_KEY = 'roles';

type Method = keyof PartnershipResultsController;

const handler = (method: Method) =>
  PartnershipResultsController.prototype[method];

const getGuards = (method: Method): unknown[] =>
  (Reflect.getMetadata(GUARDS_KEY, handler(method)) as unknown[] | undefined) ??
  [];

const getRoles = (method: Method): string[] =>
  (Reflect.getMetadata(ROLES_KEY, handler(method)) as string[] | undefined) ??
  [];

const ALL_ROUTES: Method[] = [
  'create',
  'update',
  'remove',
  'findByCampaign',
  'findMine',
  'setVisibility',
];

describe('PartnershipResultsController — guards e papéis', () => {
  // JwtAuthGuard está no @Controller (nível de classe): nenhuma rota deste
  // controller é pública.
  it('nenhuma rota é pública — o guard de JWT cobre a classe inteira', () => {
    expect(
      Reflect.getMetadata(GUARDS_KEY, PartnershipResultsController),
    ).toContain(JwtAuthGuard);
  });

  it.each(ALL_ROUTES)('exige RolesGuard em %s', (method) => {
    expect(getGuards(method)).toContain(RolesGuard);
  });

  it.each(['create', 'update', 'remove', 'findByCampaign'] as Method[])(
    'só a marca escreve ou lê resultado por campanha — %s',
    (method) => {
      expect(getRoles(method)).toEqual(['BRAND']);
    },
  );

  it.each(['findMine', 'setVisibility'] as Method[])(
    'só a creator lê os próprios resultados e decide a vitrine — %s',
    (method) => {
      expect(getRoles(method)).toEqual(['INFLUENCER']);
    },
  );
});
