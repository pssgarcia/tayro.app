/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useInstagramHandleCheck } from './useInstagramHandleCheck';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useInstagramHandleCheck', () => {
  it('consulta GET /ig/handle/:handle e devolve o desfecho', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { handle: 'anafitness', result: 'FOUND' },
    } as any);

    const { result } = renderHook(() => useInstagramHandleCheck());

    let desfecho: string | undefined;
    await act(async () => {
      desfecho = await result.current.check('anafitness');
    });

    expect(desfecho).toBe('FOUND');
    expect(api.get).toHaveBeenCalledWith('/ig/handle/anafitness');
  });

  it('expõe o desfecho atual e o handle a que ele se refere', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { handle: 'anafitness', result: 'NOT_FOUND' },
    } as any);

    const { result } = renderHook(() => useInstagramHandleCheck());
    await act(async () => {
      await result.current.check('anafitness');
    });

    await waitFor(() => {
      expect(result.current.checkedHandle).toBe('anafitness');
      expect(result.current.result).toBe('NOT_FOUND');
    });
  });

  it('não repete a chamada pro mesmo handle — reaproveita o resultado já obtido', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { handle: 'anafitness', result: 'FOUND' },
    } as any);

    const { result } = renderHook(() => useInstagramHandleCheck());

    await act(async () => {
      await result.current.check('anafitness');
      await result.current.check('anafitness');
    });

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('handles diferentes disparam chamadas diferentes', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { handle: 'x', result: 'FOUND' },
    } as any);

    const { result } = renderHook(() => useInstagramHandleCheck());

    await act(async () => {
      await result.current.check('anafitness');
      await result.current.check('outrahandle');
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('falha de rede/provedor vira UNKNOWN — nunca bloqueia', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useInstagramHandleCheck());

    let desfecho: string | undefined;
    await act(async () => {
      desfecho = await result.current.check('anafitness');
    });

    expect(desfecho).toBe('UNKNOWN');
  });

  it('UNKNOWN por falha NÃO entra no cache — uma nova tentativa consulta de novo', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network error'));
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { handle: 'anafitness', result: 'FOUND' },
    } as any);

    const { result } = renderHook(() => useInstagramHandleCheck());

    await act(async () => {
      await result.current.check('anafitness');
      await result.current.check('anafitness');
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  // Achado no /review de 2026-08-27: o dedupe só existia via cache gravado
  // NA CONCLUSÃO da chamada — duas chamadas que se sobrepõem (ex.: blur
  // ainda em voo quando o submit chama de novo) driblavam o dedupe porque
  // nenhuma das duas via a outra como "já em andamento". Reproduz a corrida
  // literalmente: duas chamadas disparadas ANTES da 1ª resposta voltar.
  it('duas chamadas concorrentes pro mesmo handle (antes da 1ª responder) consultam o provedor uma vez só', async () => {
    let resolveFn!: (v: unknown) => void;
    vi.mocked(api.get).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }) as any,
    );

    const { result } = renderHook(() => useInstagramHandleCheck());

    let primeira!: Promise<string>;
    let segunda!: Promise<string>;
    act(() => {
      primeira = result.current.check('anafitness'); // simula o blur
      segunda = result.current.check('anafitness'); // simula o submit logo em seguida
    });

    expect(api.get).toHaveBeenCalledTimes(1); // não duas, mesmo com as duas chamadas já disparadas

    let desfechoPrimeira: string | undefined;
    let desfechoSegunda: string | undefined;
    await act(async () => {
      resolveFn({ data: { handle: 'anafitness', result: 'FOUND' } });
      [desfechoPrimeira, desfechoSegunda] = await Promise.all([primeira, segunda]);
    });

    expect(desfechoPrimeira).toBe('FOUND');
    expect(desfechoSegunda).toBe('FOUND');
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('reporta checking=true durante a chamada em voo', async () => {
    let resolveFn!: (v: unknown) => void;
    vi.mocked(api.get).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }) as any,
    );

    const { result } = renderHook(() => useInstagramHandleCheck());

    let checkPromise!: Promise<string>;
    act(() => {
      checkPromise = result.current.check('anafitness');
    });

    await waitFor(() => expect(result.current.checking).toBe(true));

    await act(async () => {
      resolveFn({ data: { handle: 'anafitness', result: 'FOUND' } });
      await checkPromise;
    });

    expect(result.current.checking).toBe(false);
  });
});
