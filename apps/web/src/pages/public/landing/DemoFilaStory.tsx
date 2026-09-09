import { useState } from 'react';
import { ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatCurrency, formatEngagement, formatNumberParts } from '../../../utils/format';
import PostGrid from './PostGrid';
import { DEMO_PROGRAMA, type DemoCreator } from './demo';
import type { Decisao } from './DemoFila';
import { useT } from '../../../i18n';

// ─── Fila no celular: o Story ────────────────────────────────────────────────
// No produto, a marca não revisa candidatura numa lista quando está no celular:
// revisa em tela cheia, um candidato por vez, no formato de Story do Instagram
// (`CampaignPipelineMobileStory`). A landing mostrava a lista do desktop
// encolhida, o que contava a história errada sobre como o produto funciona.
//
// Reproduz a anatomia real, na mesma ordem: barra de progresso em segmentos,
// contador, foto sangrando com gradiente, nome, @handle linkado pro Instagram,
// seguidores e engajamento, oferta da campanha, "Ver posts" e a barra de
// decisão — com Recusar à esquerda e Aprovar em lime à direita, mais largo.
//
// Fica de fora, de propósito, o que viraria controle morto numa landing: o "X"
// de fechar e o alternador Revisar/Todas. Tudo que está aqui faz algo.

const rotulo = 'font-mono text-[11px] uppercase tracking-widest text-kinetic-muted';

interface Props {
  /** Só quem espera decisão — o Story do produto é o modo "Revisar". */
  pendentes: DemoCreator[];
  onDecidir: (creator: DemoCreator, decisao: Decisao) => void;
  onRecomecar: () => void;
}

export default function DemoFilaStory({ pendentes, onDecidir, onRecomecar }: Props) {
  const t = useT();
  const [idx, setIdx] = useState(0);
  const [postsAbertos, setPostsAbertos] = useState(false);

  if (pendentes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-kinetic-border bg-kinetic-dark px-6 py-16 text-center">
        <p className={rotulo}>{t.story.fimDaFila}</p>
        <p className="mt-4 text-balance font-display text-2xl font-bold tracking-[-.03em] text-foreground">
          {t.story.fimDaFilaTitulo}
        </p>
        <button
          type="button"
          onClick={onRecomecar}
          className="mt-6 min-h-[44px] bg-lime px-6 font-mono text-[11px] font-semibold uppercase tracking-widest text-black transition-colors hover:bg-white"
        >
          {t.story.reverFila}
        </button>
      </div>
    );
  }

  // A lista encolhe a cada decisão; o índice precisa acompanhar sem estourar.
  const posicao = Math.min(idx, pendentes.length - 1);
  const creator = pendentes[posicao];
  const seg = formatNumberParts(creator.followers);

  const ir = (delta: number) => {
    setIdx((i) => {
      const alvo = Math.min(i, pendentes.length - 1) + delta;
      return Math.max(0, Math.min(pendentes.length - 1, alvo));
    });
    setPostsAbertos(false);
  };

  return (
    <div className="mx-auto flex max-w-[420px] flex-col border border-kinetic-border bg-kinetic-black">
      {/* Progresso + contador — acompanham a POSIÇÃO na fila, não quantas
          decisões já foram tomadas. Era o bug: navegar entre candidaturas não
          movia a barra, porque ela contava decisão. Num Story a barra diz onde
          você está, igual ao `clampedIndex` do produto. */}
      <div className="flex items-center gap-4 px-4 pb-3 pt-4">
        <div
          className="flex flex-1 gap-1"
          role="img"
          aria-label={t.story.progresso(posicao + 1, pendentes.length)}
        >
          {pendentes.map((c, i) => (
            <span
              key={c.id}
              className={cn(
                'h-[3px] flex-1 transition-colors',
                i < posicao ? 'bg-kinetic-text' : i === posicao ? 'bg-lime' : 'bg-kinetic-gray',
              )}
            />
          ))}
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-kinetic-muted">
          {posicao + 1} / {pendentes.length}
        </span>
      </div>

      {/* Foto sangrando com a identidade sobre o gradiente */}
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-kinetic-dark">
        <img src={creator.avatar} alt="" className="h-full w-full object-cover" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kinetic-black via-kinetic-black/15 to-transparent"
        />

        {/* Zonas de toque — candidatura anterior / próxima, como no produto */}
        <button
          type="button"
          onClick={() => ir(-1)}
          aria-label={t.story.anterior}
          className="absolute inset-y-0 left-0 w-1/2"
        />
        <button
          type="button"
          onClick={() => ir(1)}
          aria-label={t.story.proxima}
          className="absolute inset-y-0 right-0 w-1/2"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="font-display text-3xl font-bold leading-tight tracking-[-.03em] text-white">
            {creator.nome}
          </p>
          {/* Sem href pelo mesmo motivo da placa: handle inventado não pode
              mandar ninguém pro Instagram de uma pessoa real. */}
          <p className="mt-1 flex w-fit items-center gap-1 font-mono text-sm text-kinetic-text">
            @{creator.handle}
            <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
          </p>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="flex gap-8">
          <div>
            <p className={rotulo}>{t.story.seguidores}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums tracking-[-.04em] text-white">
              {seg.value}
              {seg.suffix}
            </p>
          </div>
          <div>
            <p className={rotulo}>{t.story.engajamento}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums tracking-[-.04em] text-white">
              {formatEngagement(creator.engagement)}
            </p>
          </div>
        </div>

        <p className={cn('mb-1 mt-6', rotulo)}>{t.story.ofertaDaCampanha}</p>
        <p className="text-lg font-semibold leading-snug text-white">
          {formatCurrency(DEMO_PROGRAMA.offerAmount)}
        </p>

        <button
          type="button"
          onClick={() => setPostsAbertos((v) => !v)}
          aria-expanded={postsAbertos}
          className="mt-5 flex w-full flex-col items-center gap-1 py-2 text-kinetic-muted transition-colors hover:text-white"
        >
          <ChevronUp
            size={16}
            className={cn('transition-transform', postsAbertos && 'rotate-180')}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest">
            {postsAbertos ? t.story.fecharPosts : t.story.verPosts}
          </span>
        </button>

        {postsAbertos && <PostGrid posts={creator.posts} tone="dark" className="mb-5" />}
      </div>

      {/* Decisão: Recusar à esquerda, Aprovar em lime e mais largo à direita —
          a mesma proporção do produto. */}
      <div className="flex shrink-0 gap-3 px-5 pb-5 pt-3">
        <button
          type="button"
          onClick={() => onDecidir(creator, 'recusada')}
          className="min-h-[56px] flex-1 border border-kinetic-border font-mono text-sm font-medium uppercase tracking-widest text-kinetic-text transition-colors hover:border-[#555]"
        >
          {t.comum.recusar}
        </button>
        <button
          type="button"
          onClick={() => onDecidir(creator, 'aprovada')}
          className="min-h-[56px] flex-[1.4] bg-lime font-mono text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-white"
        >
          {t.comum.aprovar}
        </button>
      </div>
    </div>
  );
}
