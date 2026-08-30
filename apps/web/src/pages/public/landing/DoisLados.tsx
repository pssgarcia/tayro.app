import { ChevronRight } from 'lucide-react';
import KineticPlate from '../../../components/primitives/kinetic/KineticPlate';
import { cn } from '../../../lib/utils';
import { formatCurrency, formatOfferWhole } from '../../../utils/format';
import CreatorAvatar from './CreatorAvatar';
import { DEMO_CREATORS, DEMO_PROGRAMA } from './demo';

// ─── Os dois lados da plataforma ─────────────────────────────────────────────
// A landing contava só a metade da marca. O TAYRO tem dois usuários e a tese do
// produto (`vision.md`) é que eles são o MESMO produto: o dado que faz a marca
// decidir rápido é o mesmo que constrói o histórico da creator. Uma seção só
// pra "creator" no fim da página contradizia isso — virava rodapé de cortesia.
//
// Por isso a peça não são dois blocos de features lado a lado: são dois lados
// de um ciclo. Em cima, o que cada um vê (com a UI real de cada lado); embaixo,
// a ordem em que a coisa acontece, alternando de lado a cada passo — é a
// alternância que mostra que um lado depende do outro.
//
// Lime continua sendo ação: os nós do ciclo são neutros e a autoria de cada
// passo vem do rótulo e do lado, não da cor.

const kicker = 'font-mono text-[11px] uppercase tracking-widest text-kinetic-muted';

// ─── O que a marca vê: a campanha publicada e as candidaturas chegando ───────

function LadoMarca() {
  return (
    <div>
      <KineticPlate flush marks="top" className="max-w-[340px]">
        <div className="px-6 pb-5 pt-7">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#6a6a64]">
            campanha ativa
          </p>
          <p className="mt-2 font-display text-[15px] font-bold leading-tight tracking-[-.03em] text-black">
            {DEMO_PROGRAMA.titulo}
          </p>
          <div className="mt-4 flex items-end justify-between border-t border-black/10 pt-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#6a6a64]">
                oferta
              </p>
              <p className="mt-1 font-display text-xl font-bold tracking-[-.04em] text-black">
                {formatCurrency(DEMO_PROGRAMA.offerAmount)}
              </p>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#6a6a64]">
              {DEMO_PROGRAMA.vagas} vagas
            </p>
          </div>
        </div>
      </KineticPlate>

      {/* As candidaturas chegam por baixo da campanha — é literalmente o que a
          marca vê acontecer depois de publicar. */}
      <p className={cn('mb-3 mt-6', kicker)}>candidaturas recebidas</p>
      <ul className="flex max-w-[340px] flex-col gap-2">
        {DEMO_CREATORS.filter((c) => c.status === 'PENDING')
          .slice(0, 3)
          .map((creator) => (
            <li
              key={creator.id}
              className="flex items-center gap-3 border border-kinetic-gray bg-kinetic-dark p-3"
            >
              <CreatorAvatar nome={creator.nome} src={creator.avatar} size={32} tone="dark" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-semibold tracking-[-.02em] text-kinetic-text">
                  {creator.nome}
                </span>
                <span className="block truncate font-mono text-[10px] text-kinetic-muted">
                  @{creator.handle}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-lime">
                Pendente
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

// ─── O que a creator vê: a campanha aberta e a própria parceria ──────────────

function LadoCreator() {
  const oferta = formatOfferWhole(DEMO_PROGRAMA);

  return (
    <div>
      {/* Réplica do `ProgramCard` de `/programs`: é o card que a creator vê na
          vitrine, com a oferta ANTES de se candidatar. */}
      <div className="flex max-w-[340px] flex-col justify-between border border-kinetic-gray bg-kinetic-dark p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-lg font-semibold leading-snug tracking-[-.03em] text-foreground">
              {DEMO_PROGRAMA.titulo}
            </p>
            <span className="shrink-0 pt-1 font-mono text-[11px] text-kinetic-muted">01</span>
          </div>
          <p className="mt-2 text-xs text-kinetic-muted">Marca · {DEMO_PROGRAMA.vagas} vagas</p>
        </div>
        <div className="mt-7 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
              A oferta
            </p>
            <p className="mt-2 truncate font-display text-2xl font-bold tabular-nums tracking-[-.04em] text-foreground">
              {oferta?.prefix}
              {oferta?.value}
            </p>
          </div>
          <ChevronRight
            size={16}
            aria-hidden="true"
            className="mb-1 shrink-0 text-kinetic-border"
          />
        </div>
      </div>

      <p className={cn('mb-3 mt-6', kicker)}>minhas candidaturas</p>
      <div className="max-w-[340px] border border-kinetic-gray bg-kinetic-dark p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold tracking-[-.02em] text-kinetic-text">
              {DEMO_PROGRAMA.titulo}
            </span>
            <span className="mt-1 block font-mono text-[10px] text-kinetic-muted">
              {formatCurrency(DEMO_PROGRAMA.offerAmount)} · {DEMO_PROGRAMA.prazoDias} dias
            </span>
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
            Aprovada
          </span>
        </div>
        <div
          aria-hidden="true"
          className="mt-4 flex min-h-[36px] items-center justify-center border-t border-kinetic-gray bg-lime font-mono text-[10px] font-medium uppercase tracking-widest text-black"
        >
          Enviar conteúdo
        </div>
      </div>
    </div>
  );
}

// ─── O ciclo: quem faz o quê, na ordem em que acontece ───────────────────────

const CICLO: { lado: 'marca' | 'creator'; texto: string }[] = [
  { lado: 'marca', texto: 'Publica a campanha com a oferta definida' },
  { lado: 'creator', texto: 'Encontra a campanha aberta e vê a oferta' },
  { lado: 'creator', texto: 'Se candidata pelo link' },
  { lado: 'marca', texto: 'Decide com o Instagram da creator do lado' },
  { lado: 'marca', texto: 'Registra a recompensa da parceria' },
  { lado: 'creator', texto: 'Envia o conteúdo combinado' },
  { lado: 'marca', texto: 'Recebe e revisa o conteúdo' },
];

function Ciclo() {
  return (
    <ol className="mx-auto mt-16 max-w-[900px] sm:mt-20">
      {CICLO.map((passo, i) => {
        const daMarca = passo.lado === 'marca';
        return (
          <li
            key={i}
            className="grid grid-cols-[16px_1fr] items-start gap-x-4 md:grid-cols-[1fr_16px_1fr] md:gap-x-6"
          >
            {/* O texto existe UMA vez no DOM e muda de coluna por `col-start`.
                Renderizar os dois lados e esconder um com `invisible` fazia o
                leitor de tela ler cada passo duas vezes. */}
            <div
              className={cn(
                'col-start-2 pb-8 md:col-start-3',
                daMarca && 'md:col-start-1 md:text-right',
              )}
            >
              <p className={kicker}>{daMarca ? 'marca' : 'creator'}</p>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-kinetic-text">
                {passo.texto}
              </p>
            </div>

            {/* A linha do tempo: o traço contínuo é a plataforma; o quadrado
                cheio marca a marca, o vazado marca a creator. */}
            <div
              className="col-start-1 row-start-1 flex h-full justify-center md:col-start-2"
              aria-hidden="true"
            >
              <span className="relative flex h-full w-px justify-center bg-kinetic-border">
                <span
                  className={cn(
                    'absolute top-[5px] h-2 w-2 shrink-0 border',
                    daMarca
                      ? 'border-foreground bg-foreground'
                      : 'border-kinetic-text bg-background',
                  )}
                />
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function DoisLados() {
  return (
    <div>
      <div className="grid gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
        <div className="md:border-r md:border-white/10 md:pr-10 lg:pr-16">
          <p className={kicker}>marcas</p>
          <h3 className="mt-3 text-balance font-display text-2xl font-bold tracking-[-.03em] text-foreground sm:text-3xl">
            Encontre quem faz sentido.
          </h3>
          <p className="mt-4 max-w-[46ch] text-pretty text-base leading-relaxed text-kinetic-text">
            Publique a campanha com a oferta definida, receba as candidaturas e decida com o
            Instagram de cada uma na mesma tela.
          </p>
          <div className="mt-8">
            <LadoMarca />
          </div>
        </div>

        <div>
          <p className={kicker}>creators</p>
          <h3 className="mt-3 text-balance font-display text-2xl font-bold tracking-[-.03em] text-foreground sm:text-3xl">
            Encontre oportunidades que fazem sentido pra você.
          </h3>
          <p className="mt-4 max-w-[46ch] text-pretty text-base leading-relaxed text-kinetic-text">
            Veja o valor, o tipo e o prazo antes de se candidatar, acompanhe a decisão e envie o
            conteúdo pelo mesmo lugar.
          </p>
          <div className="mt-8">
            <LadoCreator />
          </div>
        </div>
      </div>

      <Ciclo />
    </div>
  );
}
