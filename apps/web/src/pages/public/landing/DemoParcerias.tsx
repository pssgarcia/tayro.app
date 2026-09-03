import { Banknote, BarChart3, Gift, Package, Tag, Truck } from 'lucide-react';
import StatFigure from '../../../components/primitives/kinetic/StatFigure';
import StatusWord from '../../../components/primitives/kinetic/StatusWord';
import { cn } from '../../../lib/utils';
import { formatNumberParts } from '../../../utils/format';
import type { ContentStatus, RewardStatus, RewardType } from '../../../types/api';
import CreatorAvatar from './CreatorAvatar';
import {
  DEMO_CREATORS,
  contentTypeWord,
  rewardTypeWord,
  type DemoCreator,
  type DemoParceria,
} from './demo';

// ─── Abas Recompensas, Conteúdos e Resultado da demonstração ─────────────────
// As três capacidades que vêm DEPOIS da decisão, e que a landing não contava.
// Não são cards genéricos de SaaS: reproduzem o comportamento real de
// `CampaignRewardsTab`, `CampaignContentTab` e `CampaignResultsTab`, com o
// mesmo vocabulário (Pendente → Emitida → Entregue; Em análise →
// Aprovado/Recusado/Revisar; A informar → Informado) e as mesmas ações
// ("Marcar como emitida", "Confirmar entrega", "Aprovar", "Revisão",
// "Recusar", "Informar resultado"), inclusive os ícones que o produto usa.
//
// A parceria só existe aqui depois que a candidatura foi aprovada na Fila — é
// essa continuidade que mostra a evolução dentro do produto, em vez de listar
// features soltas.

const rotulo = 'font-mono text-[10px] uppercase tracking-widest text-kinetic-muted';

const REWARD_ICON: Record<RewardType, React.ReactNode> = {
  MONETARY: <Banknote size={13} />,
  PRODUCT: <Package size={13} />,
  DISCOUNT: <Tag size={13} />,
};

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-kinetic-border px-6 py-14 text-center">
      <p className="text-pretty text-sm leading-relaxed text-kinetic-muted">{children}</p>
    </div>
  );
}

function Cabecalho({ creator }: { creator: DemoCreator }) {
  return (
    <div className="flex items-center gap-3">
      <CreatorAvatar nome={creator.nome} src={creator.avatar} size={36} tone="dark" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold tracking-[-.03em] text-foreground">
          {creator.nome}
        </p>
        <p className="truncate font-mono text-[11px] text-kinetic-muted">@{creator.handle}</p>
      </div>
    </div>
  );
}

const acaoPrimaria =
  'flex min-h-[44px] w-full items-center justify-center gap-2 bg-lime px-3 font-mono text-[10px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white';
const acaoSecundaria =
  'flex min-h-[44px] flex-1 items-center justify-center border border-kinetic-border px-3 font-mono text-[10px] uppercase tracking-widest text-kinetic-text transition-colors hover:border-foreground hover:text-foreground';

/** Um bloco por parceria — o container que as duas abas compartilham. */
function Bloco({ children }: { children: React.ReactNode }) {
  return <li className="border border-kinetic-border bg-kinetic-dark p-5">{children}</li>;
}

function Lista({ children }: { children: React.ReactNode }) {
  // Teto de largura: sem ele, em 1900px cada bloco passa de 690px e a barra
  // de ação lime vira uma faixa enorme — a regra do "orçamento de lime por
  // tela" some. A lista segue alinhada à esquerda, como as outras abas.
  return <ul className="grid max-w-[1080px] gap-4 sm:grid-cols-2">{children}</ul>;
}

// ─── Recompensas ─────────────────────────────────────────────────────────────

export function DemoRecompensas({
  parcerias,
  onAvancar,
}: {
  parcerias: Record<string, DemoParceria>;
  onAvancar: (creatorId: string, status: RewardStatus) => void;
}) {
  const ativos = DEMO_CREATORS.filter((c) => parcerias[c.id]);

  if (ativos.length === 0) {
    return (
      <Vazio>
        Nenhuma recompensa ainda. Aprove uma candidatura na Fila e a recompensa dela aparece aqui.
      </Vazio>
    );
  }

  return (
    <Lista>
      {ativos.map((creator) => {
        const status = parcerias[creator.id].recompensa;
        const { tipo, valor, nota } = creator.recompensa;

        return (
          <Bloco key={creator.id}>
            <div className="flex items-start justify-between gap-4">
              <Cabecalho creator={creator} />
              <StatusWord kind="reward" status={status} />
            </div>

            <div className="mt-5 border-t border-kinetic-gray pt-4">
              <p className={cn('mb-2 flex items-center gap-1.5', rotulo)}>
                {REWARD_ICON[tipo]}
                {rewardTypeWord[tipo]}
              </p>
              <p className="font-display text-2xl font-bold tracking-[-.04em] text-foreground">
                {valor}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-kinetic-muted">{nota}</p>
            </div>

            {status !== 'DELIVERED' && (
              <div className="mt-4 border-t border-kinetic-gray pt-4">
                <button
                  type="button"
                  onClick={() => onAvancar(creator.id, status === 'PENDING' ? 'ISSUED' : 'DELIVERED')}
                  className={acaoPrimaria}
                >
                  {status === 'PENDING' ? <Truck size={13} /> : <Gift size={13} />}
                  {status === 'PENDING' ? 'Marcar como emitida' : 'Confirmar entrega'}
                </button>
              </div>
            )}
          </Bloco>
        );
      })}
    </Lista>
  );
}

// ─── Conteúdos ───────────────────────────────────────────────────────────────

export function DemoConteudos({
  parcerias,
  onRevisar,
}: {
  parcerias: Record<string, DemoParceria>;
  onRevisar: (creatorId: string, status: ContentStatus) => void;
}) {
  const ativos = DEMO_CREATORS.filter((c) => parcerias[c.id]);

  if (ativos.length === 0) {
    return (
      <Vazio>
        Nenhum conteúdo ainda. Depois de aprovada, a creator envia a entrega pelo próprio TAYRO e
        ela chega aqui para revisão.
      </Vazio>
    );
  }

  return (
    <Lista>
      {ativos.map((creator) => {
        const status = parcerias[creator.id].conteudo;
        const { tipo, legenda } = creator.entrega;

        return (
          <Bloco key={creator.id}>
            <div className="flex items-start justify-between gap-4">
              <Cabecalho creator={creator} />
              <StatusWord kind="content" status={status} />
            </div>

            <div className="mt-5 border-t border-kinetic-gray pt-4">
              <p className={cn('mb-4', rotulo)}>{contentTypeWord[tipo]}</p>
              <p className={cn('mb-1', rotulo)}>legenda enviada</p>
              <p className="text-pretty text-sm leading-relaxed text-kinetic-text">
                &ldquo;{legenda}&rdquo;
              </p>
            </div>

            {status === 'PENDING' && (
              <div className="mt-4 flex flex-col gap-2 border-t border-kinetic-gray pt-4">
                <button
                  type="button"
                  onClick={() => onRevisar(creator.id, 'APPROVED')}
                  className={acaoPrimaria}
                >
                  Aprovar
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onRevisar(creator.id, 'REVISION_REQUESTED')}
                    className={acaoSecundaria}
                  >
                    Revisão
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevisar(creator.id, 'REJECTED')}
                    className={acaoSecundaria}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            )}
          </Bloco>
        );
      })}
    </Lista>
  );
}

// ─── Resultado ───────────────────────────────────────────────────────────────
// Fecha os diferenciais nº2 (histórico) e nº3 (transparência bilateral) do
// `positioning.md`: é aqui que a marca devolve pra creator o que a parceria
// deu. Igual à `CampaignResultsTab` real, a marca digita o número, não a
// gente mede. A demonstração pula o modal (aqui um clique já preenche os
// números de exemplo) mas mantém o vocabulário e a ressalva de honestidade.

function Metrica({ label, valor }: { label: string; valor: number }) {
  const { value, suffix } = formatNumberParts(valor);
  return (
    <StatFigure
      size="sm"
      label={label}
      value={
        <>
          {value}
          {suffix}
        </>
      }
    />
  );
}

export function DemoResultados({
  parcerias,
  onInformar,
}: {
  parcerias: Record<string, DemoParceria>;
  onInformar: (creatorId: string) => void;
}) {
  const ativos = DEMO_CREATORS.filter((c) => parcerias[c.id]);

  if (ativos.length === 0) {
    return (
      <Vazio>
        Nenhuma parceria aprovada ainda. Aprove uma candidatura na Fila e o resultado dela aparece
        aqui pra ser informado.
      </Vazio>
    );
  }

  return (
    <div className="max-w-[1080px]">
      <p className="mb-6 text-pretty text-sm leading-relaxed text-kinetic-muted">
        Os números são informados pela marca. O tayro não mede alcance nem impressão. Eles
        aparecem pra creator sempre, e no perfil público dela só quando a marca libera.
      </p>

      <Lista>
        {ativos.map((creator) => {
          const status = parcerias[creator.id].resultado;
          const { reach, impressions, couponsUsed, nota } = creator.resultado;

          return (
            <Bloco key={creator.id}>
              <div className="flex items-start justify-between gap-4">
                <Cabecalho creator={creator} />
                <StatusWord kind="partnershipResult" status={status} />
              </div>

              {status === 'PENDING' ? (
                <div className="mt-5 border-t border-kinetic-gray pt-4">
                  <p className="text-pretty text-sm leading-relaxed text-kinetic-text">
                    Você ainda não informou o que esta parceria deu. É o que transforma a
                    candidatura aprovada em histórico da creator.
                  </p>
                  <button
                    type="button"
                    onClick={() => onInformar(creator.id)}
                    className={cn('mt-4', acaoPrimaria)}
                  >
                    <BarChart3 size={13} />
                    Informar resultado
                  </button>
                </div>
              ) : (
                <div className="mt-5 border-t border-kinetic-gray pt-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-4">
                    <Metrica label="Alcance" valor={reach} />
                    <Metrica label="Impressões" valor={impressions} />
                    <Metrica label="Cupons" valor={couponsUsed} />
                  </div>
                  <p className="mt-4 border-l-2 border-kinetic-gray pl-3 text-pretty text-xs leading-relaxed text-kinetic-text">
                    &ldquo;{nota}&rdquo;
                  </p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
                    Informado pela marca · aparece no perfil público dela
                  </p>
                </div>
              )}
            </Bloco>
          );
        })}
      </Lista>
    </div>
  );
}
