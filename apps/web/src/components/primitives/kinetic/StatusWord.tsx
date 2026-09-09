import { cn } from '../../../lib/utils';
import {
  applicationStatusWord,
  campaignStatusWord,
  contentStatusWord,
  rewardStatusWord,
  partnershipResultWord,
} from '../../../utils/format';
import type { PartnershipResultState } from '../../../utils/format';
import type {
  ApplicationStatus,
  CampaignStatus,
  ContentStatus,
  RewardStatus,
} from '../../../types/api';

// ─── Status como palavra, não como pill ──────────────────────────────────────
// No Kinetic o status não ganha caixa: é a própria palavra em mono caixa alta.
// A cor é o único sinal e ela carrega UM significado — lime quer dizer "isto
// espera uma decisão sua", cinza quer dizer "inerte". Foi assim que a Fila
// nasceu (`status === 'PENDING' ? 'text-lime' : 'text-kinetic-muted'`) e é a
// regra que este primitivo generaliza pros outros dois domínios de status.
//
// Substitui `StatusPill` e `ContentStatusPill` (2a), que pintavam fundo sólido
// e usavam um vocabulário próprio ("Análise"/"Fechada" em vez de
// "Pendente"/"Aprovada"). Os rótulos agora saem todos de `utils/format.ts`.

type Props = {
  className?: string;
  /**
   * Sobrescreve a palavra do status. Existe pela demonstração da landing, que
   * é bilíngue enquanto o produto ainda não é: o vocabulário de status vive em
   * `utils/format.ts` só em português, e a landing precisa dizer "Pending" sem
   * arrastar as 20+ telas que consomem esses mapas.
   * Nenhum call site do produto passa isto — a cor e a semântica continuam
   * saindo do `kind`/`status`, que é o que importa neste primitivo.
   */
  label?: string;
} & (
  | { kind: 'application'; status: ApplicationStatus }
  | { kind: 'campaign'; status: CampaignStatus }
  | { kind: 'content'; status: ContentStatus }
  | { kind: 'reward'; status: RewardStatus }
  // Derivado, não enum do banco: a parceria tem resultado informado ou não.
  | { kind: 'partnershipResult'; status: PartnershipResultState }
);

/** Quem espera decisão de alguém aparece em lime. O resto é cinza. */
function isActionable(props: Props): boolean {
  switch (props.kind) {
    case 'application':
      return props.status === 'PENDING';
    case 'content':
      return props.status === 'PENDING';
    case 'campaign':
      return props.status === 'ACTIVE';
    // Recompensa tem DOIS estados que esperam a marca: PENDING pede emitir e
    // ISSUED pede confirmar a entrega. Só DELIVERED é fim de linha.
    case 'reward':
      return props.status !== 'DELIVERED';
    // Parceria sem resultado espera a marca informar — é o único estado
    // acionável, e é ele que faz o histórico da creator existir.
    case 'partnershipResult':
      return props.status === 'PENDING';
  }
}

function wordFor(props: Props): string {
  switch (props.kind) {
    case 'application':
      return applicationStatusWord[props.status];
    case 'content':
      return contentStatusWord[props.status];
    case 'campaign':
      return campaignStatusWord[props.status];
    case 'reward':
      return rewardStatusWord[props.status];
    case 'partnershipResult':
      return partnershipResultWord[props.status];
  }
}

export default function StatusWord(props: Props) {
  return (
    <span
      className={cn(
        'shrink-0 font-mono text-xs uppercase tracking-widest',
        isActionable(props) ? 'text-lime' : 'text-kinetic-muted',
        props.className,
      )}
    >
      {props.label ?? wordFor(props)}
    </span>
  );
}
