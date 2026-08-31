import { ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatEngagement, formatNumberParts } from '../../../utils/format';
import KineticPlate from '../../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../../components/primitives/kinetic/KineticActions';
import CreatorAvatar from './CreatorAvatar';
import PostGrid from './PostGrid';
import type { DemoCreator } from './demo';

// ─── A candidatura como a marca vê ───────────────────────────────────────────
// Reconstrução em código da placa de candidatura da Fila (`CampaignFilaTab`),
// com a MESMA anatomia e na mesma ordem: identidade, seguidores, engajamento,
// mensagem e posts recentes, com a barra de decisão colada embaixo. É o
// argumento inteiro da página numa peça só — "o Instagram real dela do lado do
// botão de aprovar".
//
// Sem "Match Score": existiu na Fila real como placeholder determinístico
// (hash do id, sem regra de cálculo), contradizia `vision.md` nº 5 e foi
// removido de lá em 2026-08-31 — nunca existiu aqui também, de propósito
// (numa página de marketing seria pior ainda: viraria promessa). O espaço
// dele é ocupado pelo dado que existe de verdade — seguidores, engajamento e
// os posts recentes.
//
// Nenhum metadado inventado: sem número de protocolo, sem contador. Só o que a
// tela real mostra.
//
// Duas formas:
//  · `CandidaturaPainel` — o painel do herói. A barra de decisão é DECORATIVA
//    (divs com `aria-hidden`), nunca botão: botão morto é pior que botão
//    ausente, e quem decide de verdade é a demonstração mais abaixo.
//  · `CandidaturaDetalhe` — a demonstração. Aí a barra é botão de verdade e
//    move a fila, igual ao produto.

const rotulo = 'font-mono text-[11px] uppercase tracking-widest text-[#6a6a64]';
const numero = 'font-display text-4xl font-bold tabular-nums tracking-[-.05em] text-black';

/** Seguidores e engajamento lado a lado — o par que a Fila mostra no topo. */
function Numeros({ creator }: { creator: DemoCreator }) {
  const seg = formatNumberParts(creator.followers);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <p className={cn('mb-1', rotulo)}>seguidores</p>
        <p className={numero}>
          {seg.value}
          {seg.suffix}
        </p>
      </div>
      <div>
        <p className={cn('mb-1', rotulo)}>engajamento</p>
        <p className={numero}>{formatEngagement(creator.engagement)}</p>
      </div>
    </div>
  );
}

function Identidade({
  creator,
  size,
  priority,
}: {
  creator: DemoCreator;
  size: number;
  priority?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <CreatorAvatar nome={creator.nome} src={creator.avatar} size={size} priority={priority} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-xl font-bold tracking-[-.03em] text-black sm:text-2xl">
          {creator.nome}
        </p>
        {/* Na Fila real o @ é link pro Instagram. Aqui NÃO navega: os handles
            são inventados e mandariam o visitante pro perfil de alguém real
            sem relação com o TAYRO. O ícone fica como sinal de que, no
            produto, dali se vai pro Instagram da creator. */}
        <p className="mt-1 flex w-fit items-center gap-1 font-mono text-xs text-[#6a6a64]">
          @{creator.handle}
          <ExternalLink size={11} aria-hidden="true" className="shrink-0" />
        </p>
      </div>
    </div>
  );
}

// ─── Herói: painel sem interação ─────────────────────────────────────────────

export function CandidaturaPainel({
  creator,
  className,
}: {
  creator: DemoCreator;
  className?: string;
}) {
  return (
    <KineticPlate flush marks="top" className={className}>
      <div className="px-8 pb-6 pt-8">
        <Identidade creator={creator} size={72} priority />

        <div className="mt-6 border-b border-black/10 pb-6">
          <Numeros creator={creator} />
        </div>

        <div className="mt-6">
          <p className={cn('mb-2', rotulo)}>posts recentes</p>
          {/* Faixa única no herói: em duas linhas a grade empurrava a barra de
              decisão pra fora da primeira dobra, e é justamente a vizinhança
              "Instagram ao lado do botão" que o herói precisa mostrar. */}
          <PostGrid posts={creator.posts} cols={6} priority />
        </div>
      </div>

      <div aria-hidden="true" className="flex border-t border-[#c9c9c3]">
        <span className="flex min-h-[60px] flex-1 items-center justify-center bg-lime font-mono text-xs font-medium uppercase tracking-widest text-black">
          Aprovar
        </span>
        <span className="flex min-h-[60px] flex-1 items-center justify-center border-l border-[#c9c9c3] font-mono text-xs font-medium uppercase tracking-widest text-[#4a4a44]">
          Recusar
        </span>
      </div>
    </KineticPlate>
  );
}

// ─── Demonstração: placa completa e interativa ───────────────────────────────

interface DetalheProps {
  creator: DemoCreator;
  onAprovar: () => void;
  onRecusar: () => void;
  decidida?: 'aprovada' | 'recusada';
  className?: string;
}

export function CandidaturaDetalhe({
  creator,
  onAprovar,
  onRecusar,
  decidida,
  className,
}: DetalheProps) {
  return (
    <KineticPlate as="section" flush marks="top" className={cn('flex flex-col', className)}>
      <div className="flex-1 px-8 pb-8 pt-8">
        <Identidade creator={creator} size={80} />

        <div className="mt-6 border-b border-black/10 pb-6">
          <Numeros creator={creator} />
        </div>

        <div className="mt-6">
          <p className={cn('mb-2', rotulo)}>mensagem da candidatura</p>
          <p className="text-pretty text-sm leading-relaxed text-[#33332f]">
            &ldquo;{creator.mensagem}&rdquo;
          </p>
        </div>

        <div className="mt-6">
          <p className={cn('mb-2', rotulo)}>posts recentes</p>
          <PostGrid posts={creator.posts} />
        </div>
      </div>

      {decidida ? (
        <p className="border-t border-[#c9c9c3] px-8 py-5 font-mono text-xs uppercase tracking-widest text-[#4a4a44]">
          candidatura {decidida}
        </p>
      ) : (
        <KineticActions
          className="shrink-0"
          actions={[
            { label: 'Aprovar', onClick: onAprovar, primary: true },
            { label: 'Recusar', onClick: onRecusar },
          ]}
        />
      )}
    </KineticPlate>
  );
}
