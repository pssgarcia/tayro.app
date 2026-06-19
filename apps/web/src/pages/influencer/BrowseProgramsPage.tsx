import { useState } from 'react';
import { Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBrowsePrograms } from '../../hooks/useBrowsePrograms';
import EmptyState from '../../components/primitives/EmptyState';
import ProgramCard from './ProgramCard';
import { cn } from '../../lib/utils';

export default function BrowseProgramsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useBrowsePrograms(page);

  const programs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Programas</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Programas abertos de marcas fitness — candidate-se aos que combinam com você
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 w-full animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Erro ao carregar os programas. Tente novamente.
        </p>
      )}

      {!isLoading && !isError && programs.length === 0 && (
        <EmptyState
          icon={<Compass size={22} />}
          title="Nenhum programa aberto agora"
          description="Quando marcas publicarem programas, eles aparecem aqui. Volte em breve."
        />
      )}

      {!isLoading && !isError && programs.length > 0 && (
        <>
          <div
            className={cn(
              'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
              isPlaceholderData && 'opacity-60',
            )}
          >
            {programs.map((c) => (
              <ProgramCard key={c.id} campaign={c} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
                <ChevronRight size={15} />
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {total} programa{total !== 1 ? 's' : ''} aberto{total !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}
