import type { ContentStatus, RewardStatus, RewardType } from '../../../types/api';

import heroFoto from '../../../assets/landing/hero.webp';
import creator1 from '../../../assets/landing/creator-1.webp';
import creator2 from '../../../assets/landing/creator-2.webp';
import creator3 from '../../../assets/landing/creator-3.webp';
import creator4 from '../../../assets/landing/creator-4.webp';
import feed01 from '../../../assets/landing/feed-01.webp';
import feed02 from '../../../assets/landing/feed-02.webp';
import feed03 from '../../../assets/landing/feed-03.webp';
import feed04 from '../../../assets/landing/feed-04.webp';
import feed05 from '../../../assets/landing/feed-05.webp';
import feed06 from '../../../assets/landing/feed-06.webp';
import feed07 from '../../../assets/landing/feed-07.webp';
import feed08 from '../../../assets/landing/feed-08.webp';
import feed09 from '../../../assets/landing/feed-09.webp';
import feed10 from '../../../assets/landing/feed-10.webp';
import feed11 from '../../../assets/landing/feed-11.webp';
import feed12 from '../../../assets/landing/feed-12.webp';

// ─── Dados de demonstração da landing ────────────────────────────────────────
// Creators FICTÍCIAS, retratos gerados por IA. A página DIZ isso em texto: uma
// pessoa que olha a demonstração precisa saber que aquele rosto e aquele número
// não são de ninguém — é a mesma régua do `vision.md` nº 5 aplicada à imagem.
// Nenhum dado real de creator entra aqui:
// a landing é pública e expor candidata real sem consentimento contraria o
// `vision.md` nº 3 (e a LGPD). É também por isso que a UI da demonstração é
// construída em código com os componentes do produto, em vez de um print da
// Fila real — só a FOTOGRAFIA é gerada.
//
// Os números seguem a persona: micro-creator na faixa de 8k–30k seguidores.
// O `vision.md` nº 6 diz que o TAYRO nunca vira ferramenta de mega-influencer,
// então a demonstração não pode exibir número de celebridade.
//
// Não existe score de "fit"/"match"/"alinhamento" — nem aqui nem na tela. O
// que a marca vê é o dado bruto do Instagram (seguidores, engajamento
// calculado, posts recentes) do lado do botão de decidir.

const FEED = [
  feed01, feed02, feed03, feed04, feed05, feed06,
  feed07, feed08, feed09, feed10, feed11, feed12,
];

/** Seis posts a partir de índices do acervo — cada creator com um feed próprio. */
const feedDe = (...idx: number[]) => idx.map((i) => ({ src: FEED[i] }));

export interface DemoPost {
  /** Caminho da imagem. Ausente → a grade cai no bloco neutro, que é o mesmo
   *  estado que o produto mostra quando o Instagram ainda não sincronizou. */
  src?: string;
}

export interface DemoCreator {
  id: string;
  nome: string;
  handle: string;
  followers: number;
  /** Taxa em %, no mesmo formato que a API devolve (`igEngagementRate`). */
  engagement: number;
  status: 'PENDING' | 'APPROVED';
  mensagem: string;
  avatar: string;
  posts: DemoPost[];
  /** A recompensa que a marca registra quando a parceria começa. Tipo e valor
   *  no formato real do produto (`RewardType` + `value` como texto livre). */
  recompensa: { tipo: RewardType; valor: string; nota: string };
  /** O conteúdo que a creator envia depois de aprovada. */
  entrega: { tipo: 'REEL' | 'VIDEO' | 'IMAGE' | 'STORY'; legenda: string };
}

/**
 * A candidatura do herói. Fica FORA da fila de propósito: o herói ilustra uma
 * candidatura chegando, a demonstração mostra uma fila inteira — são duas
 * cenas, não a mesma repetida duas vezes.
 */
export const HERO_CREATOR: DemoCreator = {
  id: 'demo-hero',
  nome: 'Marina Alves',
  handle: 'marina.alves',
  followers: 12_400,
  engagement: 5.8,
  status: 'PENDING',
  mensagem:
    'Treino em casa e falo muito sobre rotina real, sem estética de academia. Meu público é quase todo mulher de 25 a 34.',
  avatar: heroFoto,
  posts: feedDe(0, 1, 2, 3, 4, 5),
  recompensa: { tipo: 'MONETARY', valor: 'R$ 300,00', nota: 'Pix combinado para o dia 15.' },
  entrega: { tipo: 'REEL', legenda: 'Minha rotina de treino em casa em 30 segundos.' },
};

export const DEMO_CREATORS: DemoCreator[] = [
  {
    id: 'demo-1',
    nome: 'Helena Vasques',
    handle: 'helenavasques',
    followers: 9_700,
    engagement: 5.1,
    status: 'PENDING',
    mensagem:
      'Falo de rotina de treino sem promessa milagrosa. Meu público confia bastante no que eu indico.',
    avatar: creator1,
    posts: feedDe(0, 3, 6, 9, 1, 4),
    recompensa: { tipo: 'MONETARY', valor: 'R$ 280,00', nota: 'Pix combinado para o dia 15.' },
    entrega: { tipo: 'REEL', legenda: 'Reel com a rotina de treino da semana.' },
  },
  {
    id: 'demo-2',
    nome: 'Bia Toledo',
    handle: 'bia.toledo',
    followers: 21_300,
    engagement: 3.7,
    status: 'APPROVED',
    mensagem: 'Musculação e alimentação sem dieta restritiva.',
    avatar: creator2,
    posts: feedDe(2, 5, 8, 11, 0, 3),
    recompensa: { tipo: 'MONETARY', valor: 'R$ 450,00', nota: 'Pix enviado.' },
    entrega: { tipo: 'IMAGE', legenda: 'Carrossel com o antes e depois da rotina alimentar.' },
  },
  {
    id: 'demo-3',
    nome: 'Rafa Nogueira',
    handle: 'rafanogueira',
    followers: 8_900,
    engagement: 4.1,
    status: 'PENDING',
    mensagem: 'Corrida de rua e maratona amadora. Posto treino longo todo domingo.',
    avatar: creator3,
    posts: feedDe(6, 7, 8, 9, 10, 11),
    recompensa: { tipo: 'PRODUCT', valor: 'Kit Whey 900g', nota: 'Envio pelos Correios.' },
    entrega: { tipo: 'STORY', legenda: 'Sequência de 3 stories no treino longo de domingo.' },
  },
  {
    id: 'demo-4',
    nome: 'Caio Duarte',
    handle: 'caioduarte',
    followers: 15_600,
    engagement: 6.2,
    status: 'PENDING',
    mensagem: 'Mobilidade e alongamento. Conteúdo curto, muito salvamento.',
    avatar: creator4,
    posts: feedDe(9, 4, 7, 1, 10, 6),
    recompensa: { tipo: 'DISCOUNT', valor: 'Cupom CAIO20 (20% off)', nota: 'Válido por 60 dias.' },
    entrega: { tipo: 'VIDEO', legenda: 'Vídeo de 1 minuto com a série de mobilidade.' },
  },
];

/**
 * O programa publicado pela marca — a mesma oferta que aparece no passo 01, no
 * link do passo 02 e na placa da candidatura no Story mobile. Um objeto só pra
 * não haver três valores diferentes contando a mesma história.
 */
export const DEMO_PROGRAMA = {
  titulo: 'Creators de Verão',
  offerType: 'CASH' as const,
  offerAmount: 30_000,
  offerDescription: null,
  prazoDias: 14,
  vagas: 5,
};

/** Rótulo em português do tipo de recompensa — o mesmo do `CampaignRewardsTab`. */
export const rewardTypeWord: Record<RewardType, string> = {
  MONETARY: 'Monetária',
  PRODUCT: 'Produto',
  DISCOUNT: 'Desconto',
};

/** Rótulo do tipo de conteúdo — o mesmo do `SubmissionsPage` da creator. */
export const contentTypeWord: Record<DemoCreator['entrega']['tipo'], string> = {
  REEL: 'Reel',
  VIDEO: 'Vídeo',
  IMAGE: 'Foto',
  STORY: 'Story',
};

/** Estado de uma parceria em andamento na demonstração. */
export interface DemoParceria {
  recompensa: RewardStatus;
  conteudo: ContentStatus;
}

/** Iniciais pro fallback de avatar — mesmo recurso que o produto usa quando a
 *  creator não tem foto do Instagram sincronizada. */
export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
