import { Banknote, BarChart3, Gift, Package, Tag, Truck } from 'lucide-react';
import StatFigure from '../../../components/primitives/kinetic/StatFigure';
import StatusWord from '../../../components/primitives/kinetic/StatusWord';
import { cn } from '../../../lib/utils';
import { formatNumberParts } from '../../../utils/format';
import type { ContentStatus, RewardStatus, RewardType } from '../../../types/api';
import CreatorAvatar from './CreatorAvatar';
import { DEMO_CREATORS, type DemoCreator, type DemoParceria } from './demo';
import { useT } from '../../../i18n';

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
  const t = useT();
  const ativos = DEMO_CREATORS.filter((c) => parcerias[c.id]);

  if (ativos.length === 0) {
    return <Vazio>{t.recompensas.vazio}</Vazio>;
  }

  return (
    <Lista>
      {ativos.map((creator) => {
        const status = parcerias[creator.id].recompensa;
        const tipo = creator.recompensaTipo;
        const { recompensaValor, recompensaNota } = t.demo.creators[creator.id];

        return (
          <Bloco key={creator.id}>
            <div className="flex items-start justify-between gap-4">
              <Cabecalho creator={creator} />
              <StatusWord kind="reward" status={status} label={t.recompensas.status[status]} />
            </div>

            <div className="mt-5 border-t border-kinetic-gray pt-4">
              <p className={cn('mb-2 flex items-center gap-1.5', rotulo)}>
                {REWARD_ICON[tipo]}
                {t.recompensas.tipo[tipo]}
              </p>
              <p className="font-display text-2xl font-bold tracking-[-.04em] text-foreground">
                {recompensaValor}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-kinetic-muted">{recompensaNota}</p>
            </div>

            {status !== 'DELIVERED' && (
              <div className="mt-4 border-t border-kinetic-gray pt-4">
                <button
                  type="button"
                  onClick={() => onAvancar(creator.id, status === 'PENDING' ? 'ISSUED' : 'DELIVERED')}
                  className={acaoPrimaria}
                >
                  {status === 'PENDING' ? <Truck size={13} /> : <Gift size={13} />}
                  {status === 'PENDING' ? t.recompensas.marcarEmitida : t.recompensas.confirmarEntrega}
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
  const t = useT();
  const ativos = DEMO_CREATORS.filter((c) => parcerias[c.id]);

  if (ativos.length === 0) {
    return <Vazio>{t.conteudos.vazio}</Vazio>;
  }

  return (
    <Lista>
      {ativos.map((creator) => {
        const status = parcerias[creator.id].conteudo;
        const tipo = creator.entregaTipo;
        const { entregaLegenda } = t.demo.creators[creator.id];

        return (
          <Bloco key={creator.id}>
            <div className="flex items-start justify-between gap-4">
              <Cabecalho creator={creator} />
              <StatusWord kind="content" status={status} label={t.conteudos.status[status]} />
            </div>

            <div className="mt-5 border-t border-kinetic-gray pt-4">
              <p className={cn('mb-4', rotulo)}>{t.conteudos.tipo[tipo]}</p>
              <p className={cn('mb-1', rotulo)}>{t.conteudos.legendaEnviada}</p>
              <p className="text-pretty text-sm leading-relaxed text-kinetic-text">
                &ldquo;{entregaLegenda}&rdquo;
              </p>
            </div>

            {status === 'PENDING' && (
              <div className="mt-4 flex flex-col gap-2 border-t border-kinetic-gray pt-4">
                <button
                  type="button"
                  onClick={() => onRevisar(creator.id, 'APPROVED')}
                  className={acaoPrimaria}
                >
                  {t.comum.aprovar}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onRevisar(creator.id, 'REVISION_REQUESTED')}
                    className={acaoSecundaria}
                  >
                    {t.conteudos.revisao}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevisar(creator.id, 'REJECTED')}
                    className={acaoSecundaria}
                  >
                    {t.comum.recusar}
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
  const t = useT();
  const ativos = DEMO_CREATORS.filter((c) => parcerias[c.id]);

  if (ativos.length === 0) {
    return <Vazio>{t.resultado.vazio}</Vazio>;
  }

  return (
    <div className="max-w-[1080px]">
      <p className="mb-6 text-pretty text-sm leading-relaxed text-kinetic-muted">
        {t.resultado.ressalva}
      </p>

      <Lista>
        {ativos.map((creator) => {
          const status = parcerias[creator.id].resultado;
          const { reach, impressions, couponsUsed } = creator.resultado;
          const { resultadoNota } = t.demo.creators[creator.id];

          return (
            <Bloco key={creator.id}>
              <div className="flex items-start justify-between gap-4">
                <Cabecalho creator={creator} />
                <StatusWord
                  kind="partnershipResult"
                  status={status}
                  label={t.resultado.status[status]}
                />
              </div>

              {status === 'PENDING' ? (
                <div className="mt-5 border-t border-kinetic-gray pt-4">
                  <p className="text-pretty text-sm leading-relaxed text-kinetic-text">
                    {t.resultado.convite}
                  </p>
                  <button
                    type="button"
                    onClick={() => onInformar(creator.id)}
                    className={cn('mt-4', acaoPrimaria)}
                  >
                    <BarChart3 size={13} />
                    {t.resultado.informar}
                  </button>
                </div>
              ) : (
                <div className="mt-5 border-t border-kinetic-gray pt-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-4">
                    <Metrica label={t.resultado.alcance} valor={reach} />
                    <Metrica label={t.resultado.impressoes} valor={impressions} />
                    <Metrica label={t.resultado.cupons} valor={couponsUsed} />
                  </div>
                  <p className="mt-4 border-l-2 border-kinetic-gray pl-3 text-pretty text-xs leading-relaxed text-kinetic-text">
                    &ldquo;{resultadoNota}&rdquo;
                  </p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
                    {t.resultado.atribuicao}
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
