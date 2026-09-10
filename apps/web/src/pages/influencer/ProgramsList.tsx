import { useState } from 'react';
import { useBrowsePrograms } from '../../hooks/useBrowsePrograms';
import ProgramCard from './ProgramCard';
import { useT } from '../../i18n';
import { cn } from '../../lib/utils';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid animate-pulse gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[168px] bg-kinetic-dark" />
      ))}
    </div>
  );
}

// ─── Lista ───────────────────────────────────────────────────────────────────
// Todas as campanhas abertas com o mesmo peso visual — ver o comentário em
// ProgramCard.tsx sobre por que a placa "Em destaque" saiu. Pager de traços no
// lugar de Anterior/Próxima. Compartilhado entre /influencer/browse
// (autenticado) e /programs (vitrine pública) — só o título e o destino do
// link mudam entre os dois contextos.

interface Props {
  title: string;
  /** Destino do link de cada card. Default: detalhe autenticado (ProgramCard decide). */
  hrefBuilder?: (id: string) => string;
}

export default function ProgramsList({ title, hrefBuilder }: Props) {
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useBrowsePrograms(page);

  const programs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;
  const limit = data?.meta.limit ?? 0;
  // do meta, não do state: com isPlaceholderData o state já avançou mas o dado
  // na tela ainda é o da página anterior — numerar pelo state mostraria número errado.
  const shownPage = data?.meta.page ?? 1;

  return (
    <>
      <div className="mb-[26px] flex items-end justify-between">
        <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px] lg:text-[72px]">
          {title}
        </h1>
        <p className="shrink-0 font-display text-[32px] font-bold leading-none tracking-[-.05em] tabular-nums text-foreground">
          {total}
        </p>
      </div>

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm text-destructive">{t.app.creator.abertos.erro}</p>
      )}

      {!isLoading && !isError && programs.length === 0 && (
        <p className="text-sm text-kinetic-muted">{t.app.creator.abertos.vazio}</p>
      )}

      {!isLoading && !isError && programs.length > 0 && (
        <div className={cn(isPlaceholderData && 'opacity-60')}>
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
            {t.app.creator.abertos.todosAbertos}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {programs.map((c, i) => (
              <ProgramCard
                key={c.id}
                campaign={c}
                // numeração contínua entre páginas: na 2ª página começa em 13,
                // não em 01 — senão o mesmo número aparece em campanhas
                // diferentes conforme se navega.
                index={(shownPage - 1) * limit + i + 1}
                hrefBuilder={hrefBuilder}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-[26px] flex items-center justify-center gap-[7px]">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t.app.creator.dashboard.pagina(i + 1, totalPages)}
                  aria-current={page === i + 1}
                  onClick={() => setPage(i + 1)}
                  className={cn(
                    'h-0.5 w-[22px] rounded-full',
                    page === i + 1 ? 'bg-lime' : 'bg-[#242422]',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
