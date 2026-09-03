import { Link } from 'react-router-dom';
import type { MyPartnershipResult } from '../../types/api';
import { useSetResultVisibility } from '../../hooks/usePartnershipResults';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import { formatDate, formatNumberParts } from '../../utils/format';

// ─── Resultados das parcerias (lado creator) ─────────────────────────────────
// A metade que faltava do diferencial nº 3: a marca informa o resultado e a
// creator VÊ. Sem gate nenhum — a API não filtra por consentimento aqui, e
// esta tela não decide nada sobre isso.
//
// Vive no Registro, e não numa tela nova, por dois motivos: é literalmente o
// registro de trabalho dela (`vision.md`), e a nav do creator já tem 5 itens —
// um sexto não caberia em 360px.
//
// Sem toggle em lime aqui de propósito: a ação é um texto mono, igual ao
// "Retirar" das linhas de candidatura. Um interruptor lime por resultado
// estouraria o orçamento de lime da tela (regra 4 do design system).

const METRICS = [
  { key: 'reach', label: 'Alcance' },
  { key: 'impressions', label: 'Impressões' },
  { key: 'couponsUsed', label: 'Cupons usados' },
] as const;

function Metric({ label, value }: { label: string; value: number }) {
  const { value: figure, suffix } = formatNumberParts(value);
  return (
    <StatFigure
      size="sm"
      label={label}
      value={
        <>
          {figure}
          {suffix && <span className="text-base">{suffix}</span>}
        </>
      }
    />
  );
}

function ResultBlock({
  result,
  publicProfileEnabled,
}: {
  result: MyPartnershipResult;
  publicProfileEnabled: boolean;
}) {
  const setVisibility = useSetResultVisibility();
  const metrics = METRICS.filter(({ key }) => result[key] !== null);
  const isPublished = result.brandAllowsPublic && !result.hiddenByCreator;

  return (
    <article className="border border-kinetic-gray bg-kinetic-dark p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
        {result.brandName}
      </p>
      <p className="mt-2 font-display text-lg font-bold tracking-[-.035em] text-foreground">
        {result.campaignTitle}
      </p>

      {metrics.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-5">
          {metrics.map(({ key, label }) => (
            <Metric key={key} label={label} value={result[key] as number} />
          ))}
        </div>
      )}

      {result.note && (
        <p className="mt-6 border-l-2 border-kinetic-gray pl-4 text-sm leading-relaxed text-kinetic-text">
          {result.note}
        </p>
      )}

      {/* De quem é o número. É o que separa "histórico verificável" de
          "número solto": a marca informou, e a página diz que foi ela. */}
      <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
        Informado por {result.brandName} em {formatDate(result.createdAt, '—')}
      </p>

      <div className="mt-5 border-t border-kinetic-gray pt-4">
        {!result.brandAllowsPublic ? (
          // Transparência dos dois lados: ela fica sabendo que existe um
          // resultado que a marca escolheu não deixar público.
          <p className="text-xs leading-[1.5] text-kinetic-muted">
            {result.brandName} não liberou este resultado para o seu perfil
            público. Ele fica só entre vocês.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* UMA frase só sobre o estado da vitrine, nesta ordem de
                precedência. A versão anterior dizia "Aparece no seu perfil
                público." e, logo abaixo, que ninguém via nada: as duas eram
                verdade separadas (uma sobre o item, outra sobre o perfil) e
                juntas se contradiziam na tela. Achado abrindo no navegador;
                os testes cobriam cada frase isolada e passaram os dois. */}
            {/* Precedência: a escolha DELA sobre o item vem antes do estado do
                perfil geral. Pra um resultado que ela escondeu, avisar que o
                perfil está desligado é ruído. */}
            <p className="text-xs leading-[1.5] text-kinetic-muted">
              {result.hiddenByCreator ? (
                'Escondido do seu perfil público.'
              ) : publicProfileEnabled ? (
                'Aparece no seu perfil público.'
              ) : (
                <>
                  Seu perfil público está desligado, então ninguém vê este
                  resultado ainda.{' '}
                  <Link
                    to="/influencer/profile"
                    className="text-lime hover:underline"
                  >
                    Ligar no Perfil
                  </Link>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibility.mutate({
                  id: result.id,
                  hidden: !result.hiddenByCreator,
                })
              }
              disabled={setVisibility.isPending}
              className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
            >
              {setVisibility.isPending
                ? 'Salvando…'
                : isPublished
                  ? 'Ocultar do meu perfil'
                  : 'Mostrar no meu perfil'}
            </button>
          </div>
        )}

        {setVisibility.isError && (
          <p className="mt-3 text-xs text-destructive">
            Não foi possível salvar. Tente novamente.
          </p>
        )}
      </div>
    </article>
  );
}

export default function PartnershipResultsSection({
  results,
  publicProfileEnabled,
}: {
  results: MyPartnershipResult[];
  publicProfileEnabled: boolean;
}) {
  if (results.length === 0) return null;

  return (
    <section aria-labelledby="resultados-parcerias" className="mt-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2
          id="resultados-parcerias"
          className="font-mono text-[11px] uppercase tracking-widest text-kinetic-muted"
        >
          Resultados das parcerias
        </h2>
        <p className="shrink-0 font-display text-xl font-bold leading-none tracking-[-.04em] tabular-nums text-foreground">
          {results.length}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {results.map((result) => (
          <ResultBlock
            key={result.id}
            result={result}
            publicProfileEnabled={publicProfileEnabled}
          />
        ))}
      </div>
    </section>
  );
}
