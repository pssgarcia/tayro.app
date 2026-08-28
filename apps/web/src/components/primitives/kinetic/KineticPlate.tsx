import { cn } from '../../../lib/utils';

// ─── Placa "Kinetic Editorial" ───────────────────────────────────────────────
// O objeto claro que ancora a tela — no máximo UMA por tela, carregando o que
// mais importa ali (o número no dashboard, a oferta no apply, a candidatura
// selecionada na Fila).
//
// Difere da `Plate` do redesign 2a em três pontos, e é por isso que é um
// componente novo em vez de uma variante: fundo `kinetic-light` (mais quente),
// crop marks em L de 16px EM LIME (a 2a usa ticks de 9px cinza) e sem sombra.
// Anatomia extraída de `CampaignFilaTab.tsx`, que a desenhou inline.

interface Props {
  children: React.ReactNode;
  /** Quais cantos recebem crop mark. Placa com barra de ação colada na base
   * usa 'top' — marca inferior em cima de um bloco lime é invisível. */
  marks?: 'all' | 'top' | 'none';
  /** Sem padding interno — para placas que têm `KineticActions` na base. */
  flush?: boolean;
  /** Elemento raiz. `section` quando a placa é uma região com conteúdo próprio
   * (o detalhe da candidatura na Fila); `div` no uso decorativo. */
  as?: 'div' | 'section';
  className?: string;
}

function Mark({ pos, edges }: { pos: string; edges: string }) {
  return <span aria-hidden className={cn('absolute h-4 w-4 border-lime', pos, edges)} />;
}

export default function KineticPlate({
  children,
  marks = 'all',
  flush,
  as: Tag = 'div',
  className,
}: Props) {
  return (
    <Tag
      className={cn(
        'relative rounded-lg bg-kinetic-light text-black',
        // As crop marks ocupam de 16px a 32px a partir de cada borda, então
        // conteúdo com menos de 40px de respiro no topo COLIDE com elas — foi o
        // que aconteceu no /apply, onde a marca atravessava o "O" do rótulo
        // "O que você recebe". Padding de topo generoso é requisito da
        // anatomia, não gosto: quem sobrescrever com className precisa manter
        // `pt` >= 40px.
        flush ? 'overflow-hidden' : 'px-6 pb-8 pt-11 sm:px-8',
        className,
      )}
    >
      {marks !== 'none' && (
        <>
          <Mark pos="left-4 top-4" edges="border-l border-t" />
          <Mark pos="right-4 top-4" edges="border-r border-t" />
          {marks === 'all' && (
            <>
              <Mark pos="bottom-4 left-4" edges="border-b border-l" />
              <Mark pos="bottom-4 right-4" edges="border-b border-r" />
            </>
          )}
        </>
      )}
      {children}
    </Tag>
  );
}
