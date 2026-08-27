import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IgHandleController } from './ig-handle.controller';
import type { HandleCheckResult } from './instagram.types';

function makeConfig(budgetPerMinute?: string): ConfigService {
  return {
    get: (key: string, def?: string) =>
      key === 'IG_HANDLE_CHECK_BUDGET_PER_MINUTE'
        ? (budgetPerMinute ?? def)
        : def,
  } as unknown as ConfigService;
}

// Objeto literal (não cast pra InstagramProvider) de propósito: tipar via
// interface faz o TS enxergar `checkHandle` como method signature, e o
// eslint acusa unbound-method mesmo sendo um jest.fn — mesmo padrão já usado
// em instagram-sync.service.spec.ts.
function makeProvider(result: HandleCheckResult = 'FOUND') {
  return {
    checkHandle: jest.fn().mockResolvedValue(result),
    fetchProfile: jest.fn(),
  };
}

describe('IgHandleController', () => {
  // ─── Formato ──────────────────────────────────────────────────────────────

  it('recusa com 400 handle de formato inválido, SEM consultar o provedor', async () => {
    const provider = makeProvider();
    const controller = new IgHandleController(provider, makeConfig());

    await expect(controller.check('tem espaço')).rejects.toThrow(
      BadRequestException,
    );
    expect(provider.checkHandle).not.toHaveBeenCalled();
  });

  it('recusa com 400 handle mais longo que 30 caracteres, SEM consultar o provedor', async () => {
    const provider = makeProvider();
    const controller = new IgHandleController(provider, makeConfig());
    const longo = 'a'.repeat(31);

    await expect(controller.check(longo)).rejects.toThrow(BadRequestException);
    expect(provider.checkHandle).not.toHaveBeenCalled();
  });

  // ─── Normalização ─────────────────────────────────────────────────────────

  it('normaliza @ prefixado, maiúsculas e espaço nas pontas antes de verificar', async () => {
    const provider = makeProvider('FOUND');
    const controller = new IgHandleController(provider, makeConfig());

    const res = await controller.check('  @AnaFitness  ');

    expect(provider.checkHandle).toHaveBeenCalledWith('anafitness');
    expect(res).toEqual({ handle: 'anafitness', result: 'FOUND' });
  });

  // ─── Contrato da resposta ─────────────────────────────────────────────────

  it('resposta contém só handle e resultado — nunca dado de perfil', async () => {
    const provider = makeProvider('FOUND');
    const controller = new IgHandleController(provider, makeConfig());

    const res = await controller.check('anafitness');

    expect(Object.keys(res).sort()).toEqual(['handle', 'result']);
  });

  it.each([['FOUND'], ['NOT_FOUND'], ['UNKNOWN']] as [HandleCheckResult][])(
    'repassa o desfecho %s do provedor',
    async (result) => {
      const provider = makeProvider(result);
      const controller = new IgHandleController(provider, makeConfig());

      const res = await controller.check('anafitness');

      expect(res.result).toBe(result);
    },
  );

  // ─── Teto global por minuto ───────────────────────────────────────────────

  describe('teto global de consultas por minuto', () => {
    it('excedido o teto, devolve UNKNOWN sem consultar o provedor', async () => {
      const provider = makeProvider('FOUND');
      const controller = new IgHandleController(provider, makeConfig('2'));

      await controller.check('handle1');
      await controller.check('handle2');
      const terceira = await controller.check('handle3');

      expect(terceira).toEqual({ handle: 'handle3', result: 'UNKNOWN' });
      expect(provider.checkHandle).toHaveBeenCalledTimes(2);
    });

    it('teto reseta depois de 1 minuto', async () => {
      jest.useFakeTimers().setSystemTime(0);
      try {
        const provider = makeProvider('FOUND');
        const controller = new IgHandleController(provider, makeConfig('1'));

        await controller.check('handle1');
        const segunda = await controller.check('handle2');
        expect(segunda.result).toBe('UNKNOWN');

        jest.setSystemTime(61_000);
        const terceira = await controller.check('handle3');

        expect(terceira.result).toBe('FOUND');
        expect(provider.checkHandle).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('default do teto é 60/min quando a env não está setada', async () => {
      const provider = makeProvider('FOUND');
      const controller = new IgHandleController(provider, makeConfig());

      for (let i = 0; i < 60; i++) {
        await controller.check(`handle${i}`);
      }
      const acimaDoTeto = await controller.check('handleextra');

      expect(acimaDoTeto.result).toBe('UNKNOWN');
      expect(provider.checkHandle).toHaveBeenCalledTimes(60);
    });
  });
});
