import { useEffect, useState } from 'react';

const DEFAULT_GUARD_MS = import.meta.env.MODE === 'test' ? 0 : 350;

/**
 * PlateActionBar reaproveita o mesmo botão físico entre "Continuar" (type=button)
 * e a ação final (type=submit) nos formulários em carrossel de passos. Sem esse
 * guard, um clique duplo/toque rápido na mesma posição da tela cai no botão já
 * convertido em submit e envia o form antes do usuário ver o passo novo
 * (bug reportado 2026-08-11: cadastro de creator "pulava" direto pro login).
 *
 * O guard precisa valer JÁ na mesma renderização que muda o step - por isso
 * `setGuarding(true)` é chamado no CORPO do hook (padrão oficial do React de
 * "ajustar estado durante a renderização": https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes),
 * não num useEffect. Uma primeira versão fazia isso só no efeito e abria uma
 * janela de 1 frame em que o botão já virava type=submit mas `disabled` ainda
 * não tinha sido setado (o efeito só roda depois do commit) - um clique real
 * caiu nessa janela num teste em browser de verdade, mesmo com o guard
 * "funcionando" segundo os testes anteriores (que nunca clicavam nesse
 * instante exato). Nada de `Date.now()`/ref mutado durante o render aqui -
 * o React Compiler deste projeto proíbe (`react-hooks/purity`, `react-hooks/refs`);
 * o useEffect só agenda o re-render que expira o guard depois do delay.
 */
export function useStepGuard(step: number, delayMs = DEFAULT_GUARD_MS): boolean {
  const [prevStep, setPrevStep] = useState(step);
  const [guarding, setGuarding] = useState(false);

  if (step !== prevStep) {
    setPrevStep(step);
    setGuarding(true);
  }

  useEffect(() => {
    if (!guarding) return;
    const timer = setTimeout(() => setGuarding(false), delayMs);
    return () => clearTimeout(timer);
  }, [guarding, step, delayMs]);

  return guarding;
}
