import { useState } from 'react';
import { useBrowsePrograms } from '../../hooks/useBrowsePrograms';
import ProgramCard from './ProgramCard';
import { cn } from '../../lib/utils';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[88px] rounded-lg bg-secondary" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-secondary" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 5 do redesign 2a. O primeiro programa da PÁGINA vira a placa em
// destaque; o resto são rows. Pager de traços no lugar de Anterior/Próxima.

export default function BrowseProgramsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useBrowsePrograms(page);

  const programs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  const [featured, ...rest] = programs;

  return (
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <div className="mb-[26px] flex items-end justify-between">
        <h1 className="font-display text-d-md text-foreground">Abertos</h1>
        <p className="font-display text-d-inline leading-none tabular-nums text-foreground">
          {total}
        </p>
      </div>

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar os programas. Tente novamente.</p>
      )}

      {!isLoading && !isError && programs.length === 0 && (
        <p className="text-sm text-[#8A8A85]">Nenhum programa aberto agora. Volte em breve.</p>
      )}

      {!isLoading && !isError && featured && (
        <div className={cn(isPlaceholderData && 'opacity-60')}>
          <p className="mb-3.5 text-xs text-[#75756E]">Em destaque</p>
          <ProgramCard campaign={featured} variant="featured" />

          {rest.length > 0 && (
            <>
              <h2 className="mb-5 mt-[34px] font-display text-d-xs text-foreground">
                Todos os abertos
              </h2>
              <div className="flex flex-col gap-[22px]">
                {rest.map((c, i) => (
                  <ProgramCard key={c.id} campaign={c} variant="row" index={i + 2} />
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="mt-[26px] flex items-center justify-center gap-[7px]">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Página ${i + 1} de ${totalPages}`}
                  aria-current={page === i + 1}
                  onClick={() => setPage(i + 1)}
                  className={cn('h-0.5 w-[22px] rounded-full', page === i + 1 ? 'bg-lime' : 'bg-[#242422]')}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
