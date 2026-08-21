import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { campaignFormSchema } from './campaignFormSchema';

// O fuso da validação de "Inscrições até" tem que ser o do PRODUTO
// (America/Sao_Paulo), não o do navegador de quem preenche.
//
// Por que isso não aparecia: o backend (CampaignsService.assertDeadlineNotPast)
// fixa "hoje" em America/Sao_Paulo, e a máquina de dev também roda nesse fuso —
// então cliente e servidor concordavam por acidente. No CI (UTC) e em qualquer
// marca com o relógio fora do Brasil (VPN, viajando, sistema mal configurado) o
// form passava a discordar da API: recusava data que a API aceitaria, ou o
// inverso.
//
// O instante escolhido cai na janela em que os dois fusos discordam de dia:
// 02:00 UTC = 23:00 do dia ANTERIOR em São Paulo (UTC-3). Com TZ=UTC, um
// `new Date().getDate()` responde 21 enquanto São Paulo ainda está no dia 20 —
// é exatamente esse descompasso que o teste tranca.

const INSTANTE_UTC = '2026-08-21T02:00:00Z'; // 2026-08-20 23:00 em São Paulo
const HOJE_EM_SAO_PAULO = '2026-08-20';
const ONTEM_EM_SAO_PAULO = '2026-08-19';

/** Payload mínimo válido — só o `deadline` varia por teste. */
function makeValues(deadline: string) {
  return {
    title: 'Verão 2026',
    description: 'Conteúdo mostrando o produto no treino',
    niches: ['fitness'],
    maxSpots: 5,
    offerType: 'CASH' as const,
    offerAmountBRL: 300,
    deadline,
  };
}

describe('campaignFormSchema — deadline', () => {
  const tzOriginal = process.env.TZ;

  beforeEach(() => {
    // Navegador fora do Brasil. Sem isso o teste passa de qualquer jeito numa
    // máquina que já esteja em São Paulo — que é justamente como o bug escapou.
    process.env.TZ = 'UTC';
    vi.useFakeTimers();
    vi.setSystemTime(new Date(INSTANTE_UTC));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = tzOriginal;
  });

  it('aceita o dia de hoje em São Paulo, mesmo já sendo "amanhã" no fuso do navegador', () => {
    const result = campaignFormSchema.safeParse(makeValues(HOJE_EM_SAO_PAULO));

    expect(result.success).toBe(true);
  });

  it('recusa um dia que já passou em São Paulo', () => {
    const result = campaignFormSchema.safeParse(makeValues(ONTEM_EM_SAO_PAULO));

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'deadline');
      expect(issue?.message).toBe('A data não pode ser no passado');
    }
  });

  it('aceita data futura', () => {
    expect(campaignFormSchema.safeParse(makeValues('2099-01-01')).success).toBe(true);
  });

  it('aceita deadline vazio — o campo é opcional', () => {
    expect(campaignFormSchema.safeParse(makeValues('')).success).toBe(true);
  });
});
