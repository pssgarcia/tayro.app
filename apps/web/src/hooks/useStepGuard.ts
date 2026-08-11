import { useEffect, useRef, useState } from 'react';

const DEFAULT_GUARD_MS = import.meta.env.MODE === 'test' ? 0 : 350;

/**
 * PlateActionBar reaproveita o mesmo botão físico entre "Continuar" (type=button)
 * e a ação final (type=submit) nos formulários em carrossel de passos. Sem esse
 * guard, um clique duplo/toque rápido na mesma posição da tela cai no botão já
 * convertido em submit e envia o form antes do usuário ver o passo novo
 * (bug reportado 2026-08-11: cadastro de creator "pulava" direto pro login).
 *
 * Delay zerado em teste (MODE=test) de propósito: o valor real é coberto pelo
 * teste dedicado do hook (useStepGuard.spec.ts, com fake timers); nas páginas
 * que o consomem, esperar 350ms reais por transição infla os testes sem
 * validar nada que o teste do hook já não cubra.
 */
export function useStepGuard(step: number, delayMs = DEFAULT_GUARD_MS): boolean {
  const [guarding, setGuarding] = useState(false);
  const prevStep = useRef(step);

  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    setGuarding(true);
    const timer = setTimeout(() => setGuarding(false), delayMs);
    return () => clearTimeout(timer);
  }, [step, delayMs]);

  return guarding;
}
