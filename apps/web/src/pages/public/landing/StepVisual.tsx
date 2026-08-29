import KineticPlate from '../../../components/primitives/kinetic/KineticPlate';
import { formatCurrency, publicUrlLabel } from '../../../utils/format';
import { DEMO_CREATORS, DEMO_PROGRAMA } from './demo';

// ─── Miniaturas de UI dos passos ─────────────────────────────────────────────
// Construídas em código com o vocabulário real do produto (oferta, prazo,
// vagas, publicar, copiar link), não com imagem gerada: a UI do TAYRO existe,
// então inventá-la com IA seria mostrar um produto que não é o nosso.
//
// São representações reduzidas — o objetivo é a leitura de relance ao lado do
// texto do passo. A tela cheia de verdade é a seção de demonstração, abaixo.
//
// O passo 02 mostra a PLACA do programa publicado, com o "Copiar link" que a
// marca usa pra divulgar: é o objeto que o passo descreve, e sem ele o passo
// falava de um link que a página nunca mostrava.

const Moldura = ({ children, canto }: { children: React.ReactNode; canto: string }) => (
  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border border-kinetic-border bg-kinetic-dark p-5">
    {children}
    <span
      aria-hidden="true"
      className="absolute right-3 top-3 font-mono text-[9px] uppercase tracking-widest text-kinetic-muted"
    >
      {canto}
    </span>
  </div>
);

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-[9px] uppercase tracking-widest text-kinetic-muted">
    {children}
  </span>
);

const oferta = formatCurrency(DEMO_PROGRAMA.offerAmount);

export default function StepVisual({ step }: { step: 1 | 2 | 3 }) {
  // ── 01 · Publicar o programa ──────────────────────────────────────────────
  if (step === 1) {
    return (
      <Moldura canto="programa">
        <div className="w-full max-w-[280px] border border-kinetic-gray bg-kinetic-black p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Rotulo>oferta</Rotulo>
              <span className="font-display text-sm font-bold tracking-tight text-foreground">
                {oferta}
              </span>
            </div>
            <span className="h-px w-full bg-kinetic-gray" />
            <div className="flex items-center justify-between">
              <Rotulo>prazo</Rotulo>
              <span className="font-mono text-[10px] text-kinetic-text">
                {DEMO_PROGRAMA.prazoDias} dias
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Rotulo>vagas</Rotulo>
              <span className="font-mono text-[10px] text-kinetic-text">{DEMO_PROGRAMA.vagas}</span>
            </div>
          </div>
          <div className="mt-4 flex min-h-[28px] items-center justify-center bg-lime font-mono text-[9px] font-medium uppercase tracking-widest text-black">
            Publicar
          </div>
        </div>
      </Moldura>
    );
  }

  // ── 02 · A placa do programa publicado, com o link pra divulgar ───────────
  if (step === 2) {
    return (
      <Moldura canto="link">
        <KineticPlate flush marks="top" className="w-full max-w-[300px]">
          <div className="px-6 pb-5 pt-7">
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#6a6a64]">
              programa ativo
            </p>
            <p className="mt-2 text-balance font-display text-[15px] font-bold leading-tight tracking-[-.03em] text-black">
              {DEMO_PROGRAMA.titulo}
            </p>
            <p className="mt-3 font-display text-2xl font-bold tracking-[-.04em] text-black">
              {oferta}
            </p>
            <p className="mt-3 truncate border-t border-black/10 pt-3 font-mono text-[9px] text-[#6a6a64]">
              {publicUrlLabel('/apply/…')}
            </p>
          </div>
          <div aria-hidden="true" className="flex border-t border-[#c9c9c3]">
            <span className="flex min-h-[36px] flex-1 items-center justify-center bg-lime font-mono text-[9px] font-medium uppercase tracking-widest text-black">
              Copiar link
            </span>
          </div>
        </KineticPlate>
      </Moldura>
    );
  }

  // ── 03 · Decidir com o Instagram do lado ──────────────────────────────────
  const creator = DEMO_CREATORS[0];

  return (
    <Moldura canto="fila">
      <div className="w-full max-w-[290px] border border-kinetic-gray bg-kinetic-black p-3">
        <div className="flex items-center gap-3">
          <img
            src={creator.avatar}
            alt=""
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-md object-cover object-[50%_28%]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[11px] font-semibold tracking-[-.02em] text-kinetic-text">
              {creator.nome}
            </p>
            <p className="truncate font-mono text-[9px] text-kinetic-muted">@{creator.handle}</p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-lime">Pendente</span>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1">
          {creator.posts.slice(0, 6).map((post, i) => (
            <img
              key={i}
              src={post.src}
              alt=""
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>
        <div className="mt-3 flex">
          <span className="flex min-h-[24px] flex-1 items-center justify-center bg-lime font-mono text-[9px] font-medium uppercase tracking-widest text-black">
            Aprovar
          </span>
          <span className="flex min-h-[24px] flex-1 items-center justify-center border border-l-0 border-kinetic-gray font-mono text-[9px] uppercase tracking-widest text-kinetic-muted">
            Recusar
          </span>
        </div>
      </div>
    </Moldura>
  );
}
