import KineticRow from '../../../components/primitives/kinetic/KineticRow';
import StatusWord from '../../../components/primitives/kinetic/StatusWord';
import { formatNumberParts } from '../../../utils/format';
import type { ApplicationStatus } from '../../../types/api';
import CreatorAvatar from './CreatorAvatar';
import { CandidaturaDetalhe } from './CandidaturaPlate';
import { DEMO_CREATORS, type DemoCreator, type DemoCreatorId } from './demo';
import { useT } from '../../../i18n';

// ─── Aba Fila da demonstração ────────────────────────────────────────────────
// Reconstrói a Fila real da marca (`CampaignFilaTab`) com os primitivos do
// próprio produto: lista de candidaturas à esquerda, placa da selecionada à
// direita. Decidir move a fila — a candidatura decidida sai do pendente e a
// próxima abre sozinha, exatamente como no produto.
//
// O estado vive no `DemoProduto`, não aqui: aprovar nesta aba faz nascer uma
// parceria que aparece nas abas Recompensas e Conteúdos, e essa continuidade é
// o argumento da seção.
//
// No celular a lista vem ANTES da placa no DOM de propósito: tocar numa linha
// precisa atualizar uma placa que já esteja no campo de visão — mesma lição da
// aba Entregas.

export type Decisao = 'aprovada' | 'recusada';

interface Props {
  decisoes: Record<string, Decisao>;
  selecionada: DemoCreator;
  onSelecionar: (id: DemoCreatorId) => void;
  onDecidir: (decisao: Decisao) => void;
}

/** Status efetivo: o que a creator trouxe, ou o que foi decidido aqui. */
function statusDe(
  id: string,
  original: ApplicationStatus,
  decisoes: Record<string, Decisao>,
): ApplicationStatus {
  const d = decisoes[id];
  if (d === 'aprovada') return 'APPROVED';
  if (d === 'recusada') return 'REJECTED';
  return original;
}

/** A placa só mostra Aprovar/Recusar pra quem de fato espera decisão — mesma
 *  regra da Fila real, onde candidatura decidida abre em leitura. */
function decisaoDe(creator: DemoCreator, decisoes: Record<string, Decisao>): Decisao | undefined {
  return decisoes[creator.id] ?? (creator.status === 'APPROVED' ? 'aprovada' : undefined);
}

export default function DemoFila({ decisoes, selecionada, onSelecionar, onDecidir }: Props) {
  const t = useT();

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      {/* `min-w-0` nas duas colunas: item de grid nasce com `min-width: auto`,
          então o conteúdo mais largo (a linha da candidatura) estica a trilha
          em vez de truncar, e a seção inteira vazava a viewport em 360px. */}
      <div className="min-w-0 lg:col-span-5">
        <p className="mb-3 border-b border-kinetic-border pb-3 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
          {t.fila.candidaturas}
        </p>

        <ul className="flex flex-col gap-1">
          {DEMO_CREATORS.map((creator, i) => {
            const seg = formatNumberParts(creator.followers);
            const status = statusDe(creator.id, creator.status, decisoes);
            return (
              <li key={creator.id}>
                <KineticRow
                  index={i + 1}
                  selected={creator.id === selecionada.id}
                  onClick={() => onSelecionar(creator.id)}
                  leading={
                    <CreatorAvatar nome={creator.nome} src={creator.avatar} size={36} tone="dark" />
                  }
                  title={creator.nome}
                  meta={t.fila.meta(creator.handle, `${seg.value}${seg.suffix}`)}
                  trailing={
                    <StatusWord
                      kind="application"
                      status={status}
                      label={t.fila.status[status]}
                    />
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-w-0 lg:col-span-7">
        <CandidaturaDetalhe
          creator={selecionada}
          decidida={decisaoDe(selecionada, decisoes)}
          onAprovar={() => onDecidir('aprovada')}
          onRecusar={() => onDecidir('recusada')}
        />
      </div>
    </div>
  );
}
