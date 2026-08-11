import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrowsePrograms } from '../../hooks/useBrowsePrograms';
import { useAuthStore } from '../../stores/auth.store';
import ProgramCard from '../influencer/ProgramCard';
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
// Vitrine pública (roadmap.md, AGORA #4): mesma listagem de /influencer/browse,
// mas sem InfluencerGuard — visitante sem conta decide se vale a pena ANTES de
// se cadastrar. Card leva pro /apply/:id (já existente, cria conta ao
// candidatar) se anônima, ou pro detalhe autenticado se já houver sessão de
// creator — nesse caso o fluxo respeita candidatura já existente.

export default function BrowseProgramsPublicPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useBrowsePrograms(page);
  const { accessToken, user } = useAuthStore();

  const isLoggedInfluencer = !!accessToken && user?.role === 'INFLUENCER';
  const hrefBuilder = (id: string) =>
    isLoggedInfluencer ? `/influencer/programs/${id}` : `/apply/${id}`;

  const programs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  const [featured, ...rest] = programs;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center px-6">
        <Link
          to="/login"
          className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground hover:opacity-80 transition-opacity"
        >
          tay<span className="text-lime">ro</span>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10 pt-[14px]">
        <div className="mb-[26px] flex items-end justify-between">
          <h1 className="font-display text-d-md text-foreground">Programas abertos</h1>
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
            <ProgramCard campaign={featured} variant="featured" hrefBuilder={hrefBuilder} />

            {rest.length > 0 && (
              <>
                <h2 className="mb-5 mt-[34px] font-display text-d-xs text-foreground">
                  Todos os abertos
                </h2>
                <div className="flex flex-col gap-[22px]">
                  {rest.map((c, i) => (
                    <ProgramCard
                      key={c.id}
                      campaign={c}
                      variant="row"
                      index={i + 2}
                      hrefBuilder={hrefBuilder}
                    />
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
      </main>
    </div>
  );
}
