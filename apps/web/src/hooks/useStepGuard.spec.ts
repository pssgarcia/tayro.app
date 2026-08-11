import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStepGuard } from './useStepGuard';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useStepGuard', () => {
  it('começa sem guarda', () => {
    const { result } = renderHook(() => useStepGuard(0, 350));
    expect(result.current).toBe(false);
  });

  it('não guarda quando o step não muda entre renders', () => {
    const { result, rerender } = renderHook(({ step }) => useStepGuard(step, 350), {
      initialProps: { step: 0 },
    });
    rerender({ step: 0 });
    expect(result.current).toBe(false);
  });

  it('ativa a guarda imediatamente quando o step muda, e desativa só após o delay', () => {
    const { result, rerender } = renderHook(({ step }) => useStepGuard(step, 350), {
      initialProps: { step: 0 },
    });

    rerender({ step: 1 });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('reinicia o timer se o step mudar de novo antes do delay anterior acabar', () => {
    const { result, rerender } = renderHook(({ step }) => useStepGuard(step, 350), {
      initialProps: { step: 0 },
    });

    rerender({ step: 1 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true); // ainda guardando o 1º timer

    rerender({ step: 2 }); // muda de novo antes do 1º expirar
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(true); // novo timer, ainda não passaram 350ms dele

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(false);
  });

  it('limpa o timer pendente ao desmontar (não deixa setState vazando)', () => {
    const { rerender, unmount } = renderHook(({ step }) => useStepGuard(step, 350), {
      initialProps: { step: 0 },
    });
    rerender({ step: 1 });
    unmount();

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }).not.toThrow();
  });
});
