import { useMemo, useState } from 'react';
import KineticTabs from '../../../components/primitives/kinetic/KineticTabs';
import type { ContentStatus, RewardStatus } from '../../../types/api';
import DemoFila, { type Decisao } from './DemoFila';
import DemoFilaStory from './DemoFilaStory';
import { DemoConteudos, DemoRecompensas, DemoResultados } from './DemoParcerias';
import { DEMO_CREATORS, type DemoCreator, type DemoParceria } from './demo';

// ─── A demonstração do produto ───────────────────────────────────────────────
// A seção mais forte da página, e a única interativa. Não é uma vitrine de
// features soltas: são as quatro abas que a marca realmente usa no detalhe de
// campanha (`/brand/campaigns/:id`), na ordem em que a parceria acontece.
//
// A continuidade é o argumento: aprovar na Fila faz nascer uma parceria, que
// aparece como recompensa a registrar, conteúdo a revisar e, no fim,
// resultado a informar. Quem clica vê o ciclo inteiro — candidatura → decisão
// → recompensa → entrega → resultado — sem que a gente precise afirmar nada.
// A aba Resultado é o que fecha os diferenciais nº2/nº3 do `positioning.md`
// (histórico e transparência bilateral).
//
// Toda a UI é construída em código com os primitivos do produto. Só as FOTOS
// são geradas (ver `demo.ts`).

const ABAS = [
  { id: 'fila', label: 'Fila' },
  { id: 'recompensas', label: 'Recompensas' },
  { id: 'conteudos', label: 'Conteúdos' },
  { id: 'resultado', label: 'Resultado' },
] as const;

type Aba = (typeof ABAS)[number]['id'];

/** A creator que já chega aprovada tem parceria em andamento desde o início —
 *  senão as duas abas seguintes abririam vazias e ninguém veria o que elas são. */
const PARCERIAS_INICIAIS: Record<string, DemoParceria> = Object.fromEntries(
  DEMO_CREATORS.filter((c) => c.status === 'APPROVED').map((c) => [
    c.id,
    {
      recompensa: 'ISSUED' as RewardStatus,
      conteudo: 'PENDING' as ContentStatus,
      resultado: 'PENDING' as const,
    },
  ]),
);

export default function DemoProduto() {
  const [aba, setAba] = useState<Aba>('fila');
  const [decisoes, setDecisoes] = useState<Record<string, Decisao>>({});
  const [parcerias, setParcerias] = useState<Record<string, DemoParceria>>(PARCERIAS_INICIAIS);
  const [selecionadaId, setSelecionadaId] = useState(DEMO_CREATORS[0].id);

  // "Pendente" é quem chegou pendente E ainda não foi decidida aqui.
  const pendentes = useMemo(
    () => DEMO_CREATORS.filter((c) => c.status === 'PENDING' && !decisoes[c.id]),
    [decisoes],
  );

  const selecionada = DEMO_CREATORS.find((c) => c.id === selecionadaId) ?? DEMO_CREATORS[0];
  const intocada = Object.keys(decisoes).length === 0 && parcerias === PARCERIAS_INICIAIS;

  // Recebe a creator em vez de usar a selecionada: no celular quem decide é o
  // Story, que anda pela própria fila e não compartilha a seleção do desktop.
  function decidir(creator: DemoCreator, decisao: Decisao) {
    const proxima = pendentes.find((c) => c.id !== creator.id);

    setDecisoes((atual) => ({ ...atual, [creator.id]: decisao }));

    // Aprovar abre a parceria: é o que faz a recompensa, a entrega e o
    // resultado existirem.
    if (decisao === 'aprovada') {
      setParcerias((atual) => ({
        ...atual,
        [creator.id]: { recompensa: 'PENDING', conteudo: 'PENDING', resultado: 'PENDING' },
      }));
    }

    if (proxima) setSelecionadaId(proxima.id);
  }

  function avancarRecompensa(creatorId: string, status: RewardStatus) {
    setParcerias((atual) => ({ ...atual, [creatorId]: { ...atual[creatorId], recompensa: status } }));
  }

  function revisarConteudo(creatorId: string, status: ContentStatus) {
    setParcerias((atual) => ({ ...atual, [creatorId]: { ...atual[creatorId], conteudo: status } }));
  }

  function informarResultado(creatorId: string) {
    setParcerias((atual) => ({
      ...atual,
      [creatorId]: { ...atual[creatorId], resultado: 'REGISTERED' },
    }));
  }

  function recomecar() {
    setDecisoes({});
    setParcerias(PARCERIAS_INICIAIS);
    setSelecionadaId(DEMO_CREATORS[0].id);
    setAba('fila');
  }

  return (
    <div>
      <KineticTabs tabs={ABAS} active={aba} onChange={setAba} className="px-0 sm:px-0" />

      {/* A ressalva fica no TOPO, colada nas abas: embaixo ela virava uma linha
          solta no fim da seção, longe do que estava descrevendo. Diz as duas
          coisas que importam — as pessoas não existem e as fotos são geradas. */}
      <p className="mb-8 mt-4 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
        Creators fictícias · imagens geradas · dados de demonstração
      </p>

      {aba === 'fila' && (
        <>
          {/* Duas superfícies, como no produto: lista + placa no desktop,
              Story em tela cheia no celular. Não é a mesma tela encolhida. */}
          <div className="hidden lg:block">
            <DemoFila
              decisoes={decisoes}
              selecionada={selecionada}
              onSelecionar={setSelecionadaId}
              onDecidir={(d) => decidir(selecionada, d)}
            />
          </div>
          <div className="lg:hidden">
            <DemoFilaStory pendentes={pendentes} onDecidir={decidir} onRecomecar={recomecar} />
          </div>
        </>
      )}
      {aba === 'recompensas' && (
        <DemoRecompensas parcerias={parcerias} onAvancar={avancarRecompensa} />
      )}
      {aba === 'conteudos' && <DemoConteudos parcerias={parcerias} onRevisar={revisarConteudo} />}
      {aba === 'resultado' && (
        <DemoResultados parcerias={parcerias} onInformar={informarResultado} />
      )}

      <div className="mt-6 flex justify-end">
        {!intocada && (
          <button
            type="button"
            onClick={recomecar}
            className="rounded-sm font-mono text-[10px] uppercase tracking-widest text-kinetic-text underline-offset-4 transition-colors hover:text-lime hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Recomeçar demonstração
          </button>
        )}
      </div>
    </div>
  );
}
