import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';
import type { HandleCheckResponse, HandleCheckResult } from '../types/api';

interface CurrentCheck {
  checkedHandle?: string;
  result?: HandleCheckResult;
}

/**
 * Verificação imperativa de existência de um @ (não é query declarativa —
 * é disparada por blur/submit, ver specs/creator-discovery-and-apply e
 * specs/creator-account). Compartilhado entre PublicApplyPage e
 * RegisterInfluencerPage.
 *
 * Guarda internamente um mapa handle → Promise pra nunca fazer duas
 * requisições em voo pro mesmo @ — não só um mapa de resultado já pronto.
 * Sem isso, sair do campo (blur) e clicar em enviar logo em seguida, antes
 * da resposta do blur voltar, disparava uma SEGUNDA chamada pro mesmo
 * handle (achado no `/review` de 2026-08-27): o cache só via a 1ª chamada
 * como "ainda não verificada" porque só gravava o resultado depois de
 * pronto. Guardar a Promise em vez do resultado faz a 2ª chamada esperar a
 * 1ª em vez de disparar uma requisição duplicada.
 *
 * `checkedHandle`/`result` refletem SEMPRE a última verificação concluída —
 * se o campo mudou de valor depois disso, `checkedHandle` não bate mais com
 * o handle atual, e é assim que a tela sabe que o desfecho mostrado ficou
 * obsoleto.
 */
export function useInstagramHandleCheck() {
  const cacheRef = useRef(new Map<string, Promise<HandleCheckResult>>());
  const [checking, setChecking] = useState(false);
  const [current, setCurrent] = useState<CurrentCheck>({});

  const check = useCallback(async (handle: string): Promise<HandleCheckResult> => {
    let pending = cacheRef.current.get(handle);
    if (!pending) {
      pending = api
        .get<HandleCheckResponse>(`/ig/handle/${encodeURIComponent(handle)}`)
        .then((res) => res.data.result);
      cacheRef.current.set(handle, pending);
    }

    setChecking(true);
    try {
      const result = await pending;
      setCurrent({ checkedHandle: handle, result });
      return result;
    } catch {
      // Rede, 429 da própria rota de verificação, provedor fora do ar: trata
      // como indeterminado e NUNCA bloqueia (regra 11 de creator-discovery-
      // and-apply). Remove do cache — uma falha transitória não pode grudar
      // no @ de alguém; a próxima tentativa (blur de novo, ou o submit)
      // consulta de novo em vez de repetir "UNKNOWN" pra sempre.
      cacheRef.current.delete(handle);
      setCurrent({ checkedHandle: handle, result: 'UNKNOWN' });
      return 'UNKNOWN';
    } finally {
      setChecking(false);
    }
  }, []);

  return { check, checking, checkedHandle: current.checkedHandle, result: current.result };
}
