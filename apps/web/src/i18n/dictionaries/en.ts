import type { Dictionary } from './pt';
import { enApp } from './en.app';

// ─── Dicionário: inglês ──────────────────────────────────────────────────────
// `satisfies Dictionary` é o que segura este arquivo: chave que falta e chave
// que sobra viram erro de compilação, então a versão em inglês não apodrece
// em silêncio quando a landing em português mudar.
//
// Três restrições que valem aqui e que NÃO são estilo:
//  1. Nada de travessão (regra do produto, travada por teste nos dois apps).
//  2. Nenhuma palavra que prometa métrica inexistente: "match", "score",
//     "fit", "alignment", "verified". A landing em português é testada contra
//     isso (vision.md nº 5) e o inglês tem o mesmo teste — foi fácil escorregar
//     em "a good fit", que é a tradução natural de "faz sentido".
//  3. Gênero neutro. O português resolveu falando do objeto (candidatura,
//     campanha); em inglês o pronome é "they/their", nunca "her".
//
// Os documentos legais existem SÓ em português: os rótulos do rodapé dizem
// isso em vez de fingir que há versão em inglês.

export const en = {
  app: enApp,

  idioma: {
    nome: 'English',
    curto: 'EN',
    alternar: 'Change language',
  },

  meta: {
    titulo: 'Tayro | the creator platform for brands that decide by hand',
    descricao:
      'The platform for the brand that already receives creator applications and decides by hand. Every application arrives with the creator real Instagram right next to the approve button.',
  },

  comum: {
    pularParaConteudo: 'Skip to content',
    voltarAoTopo: 'TAYRO, back to top',
    conta: 'Account',
    entrar: 'Log in',
    criarConta: 'Create account',
    aprovar: 'Approve',
    recusar: 'Decline',
    pendente: 'Pending',
    aprovada: 'Approved',
  },

  hero: {
    kicker: 'Platform for brands',
    tituloLinha1: 'Choosing who to work with should take minutes,',
    tituloLinha2: 'not an afternoon on Instagram.',
    descricaoAntes: '',
    descricaoDepois:
      ' is the platform for the brand that already receives creator applications and decides by hand. Every application arrives with the creator real Instagram right next to the approve button.',
    ctaConversar: "Let's talk",
    ctaCampanhas: 'See open campaigns',
    ressalvaFicticia: 'Fictional creator · generated image',
  },

  problema: {
    titulo: 'the problem',
    itens: [
      {
        kicker: 'the inbox',
        texto: 'Applications arrive by DM and by form, and get lost among all the others.',
      },
      {
        kicker: 'the decision',
        texto: 'To decide, you open each Instagram profile by hand, an entire afternoon.',
      },
      {
        kicker: 'the follow-up',
        texto:
          'The rest turns into a spreadsheet and WhatsApp, and at the end of the month nobody knows what worked.',
      },
    ],
  },

  como: {
    titulo: 'how it works',
    passo: (n: number) => `step ${String(n).padStart(2, '0')}`,
    passos: [
      'Publish the campaign with the offer already set: amount, type and deadline. Everyone sees the same terms before applying.',
      'Share the link. The creator applies without having to create an account first. The account comes afterwards.',
      'Decide with their real Instagram next to the button: followers, calculated engagement and the latest posts, updated on their own.',
    ],
    cantos: { campanha: 'campaign', link: 'link', fila: 'queue' },
    campanhaAtiva: 'active campaign',
    oferta: 'offer',
    prazo: 'deadline',
    vagas: 'spots',
    dias: (n: number) => `${n} days`,
    publicar: 'Publish',
    copiarLink: 'Copy link',
  },

  produto: {
    titulo: 'the partnership inside the product',
    descricao:
      'From application to result, in the same tabs the brand uses. Approve an application and follow the partnership become a registered reward, content under review and the result that stays in the creator history.',
    abas: {
      fila: 'Queue',
      recompensas: 'Rewards',
      conteudos: 'Content',
      resultado: 'Result',
    },
    ressalva: 'Fictional creators · generated images · demo data',
    recomecar: 'Restart demo',
  },

  fila: {
    candidaturas: 'applications',
    seguidores: 'followers',
    engajamento: 'engagement',
    postsRecentes: 'recent posts',
    mensagemDaCandidatura: 'application message',
    meta: (handle: string, seguidores: string) => `@${handle} · ${seguidores} followers`,
    decidida: (decisao: string) => `application ${decisao}`,
    decisaoAprovada: 'approved',
    decisaoRecusada: 'declined',
    status: {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Declined',
      WITHDRAWN: 'Withdrawn',
    },
  },

  story: {
    progresso: (atual: number, total: number) => `${atual} of ${total}`,
    anterior: 'Previous application',
    proxima: 'Next application',
    seguidores: 'Followers',
    engajamento: 'Engagement',
    ofertaDaCampanha: 'Campaign offer',
    verPosts: 'See posts',
    fecharPosts: 'Close posts',
    fimDaFila: 'end of the queue',
    fimDaFilaTitulo: 'No application waiting for a decision.',
    reverFila: 'Review the queue again',
  },

  recompensas: {
    vazio:
      'No reward yet. Approve an application in the Queue and its reward shows up here.',
    marcarEmitida: 'Mark as issued',
    confirmarEntrega: 'Confirm delivery',
    tipo: {
      MONETARY: 'Cash',
      PRODUCT: 'Product',
      DISCOUNT: 'Discount',
    },
    status: {
      PENDING: 'Pending',
      ISSUED: 'Issued',
      DELIVERED: 'Delivered',
    },
  },

  conteudos: {
    vazio:
      'No content yet. Once approved, the creator submits the delivery through TAYRO itself and it arrives here for review.',
    legendaEnviada: 'submitted caption',
    revisao: 'Revision',
    tipo: {
      REEL: 'Reel',
      VIDEO: 'Video',
      IMAGE: 'Photo',
      STORY: 'Story',
    },
    status: {
      PENDING: 'Under review',
      APPROVED: 'Approved',
      REJECTED: 'Declined',
      REVISION_REQUESTED: 'Revise',
    },
  },

  resultado: {
    vazio:
      'No approved partnership yet. Approve an application in the Queue and its result shows up here to be reported.',
    ressalva:
      'The numbers are reported by the brand. TAYRO does not measure reach or impressions. They always appear to the creator, and on their public profile only when the brand allows it.',
    convite:
      'You have not reported what this partnership delivered yet. That is what turns an approved application into history for the creator.',
    informar: 'Report result',
    alcance: 'Reach',
    impressoes: 'Impressions',
    cupons: 'Coupons',
    atribuicao: 'Reported by the brand · appears on their public profile',
    status: {
      PENDING: 'To report',
      REGISTERED: 'Reported',
    },
  },

  doisLados: {
    titulo: 'the two sides of the partnership',
    descricao:
      'The brand creates the opportunity and the creator finds it. Each one sees their own part of the same campaign, from the first announcement to the result that becomes history for the creator.',
    marca: 'brand',
    marcas: 'brands',
    creator: 'creator',
    creators: 'creators',
    marcaTitulo: 'Find the people who make sense.',
    marcaDescricao:
      'Publish the campaign with the offer set, receive the applications and decide with each Instagram profile on the same screen.',
    creatorTitulo: 'Find opportunities that make sense for you.',
    creatorDescricao:
      'See the amount, the type and the deadline before applying, follow the decision and submit the content in the same place.',
    candidaturasRecebidas: 'applications received',
    minhasCandidaturas: 'my applications',
    aOferta: 'The offer',
    marcaEVagas: (vagas: number) => `Brand · ${vagas} spots`,
    nVagas: (vagas: number) => `${vagas} spots`,
    enviarConteudo: 'Submit content',
    ofertaEPrazo: (oferta: string, dias: number) => `${oferta} · ${dias} days`,
    ciclo: [
      'Publishes the campaign with the offer set',
      'Finds the open campaign and sees the offer',
      'Applies through the link',
      'Decides with the Instagram profile alongside',
      'Registers the partnership reward',
      'Submits the agreed content',
      'Receives and reviews the content',
      'Reports the partnership result',
      'Sees the result in the history on their profile',
    ],
  },

  cta: {
    titulo: 'Want to see if it solves your case?',
    descricao:
      'Tell us how you work with creators today. If TAYRO makes sense for you, we show it running, with no sales pitch.',
  },

  rodape: {
    nav: 'Footer',
    entrar: 'Log in',
    criarContaMarca: 'Create a brand account',
    campanhasAbertas: 'Open campaigns',
    // Os dois documentos existem só em português e são a versão que vale.
    // Dizer isso no rótulo é mais honesto que um link que promete inglês.
    termos: 'Terms of use (in Portuguese)',
    privacidade: 'Privacy (in Portuguese)',
    direitos: (ano: number) => `© ${ano} TAYRO. All rights reserved.`,
  },

  demo: {
    campanha: 'Summer Creators',
    creators: {
      'demo-hero': {
        mensagem:
          'I train at home and talk a lot about real routine, without the gym aesthetic. Almost everyone who follows me is a woman between 25 and 34.',
        recompensaValor: 'R$ 300.00',
        recompensaNota: 'Bank transfer agreed for the 15th.',
        entregaLegenda: 'My home workout routine in 30 seconds.',
        resultadoNota: 'Best delivery of the campaign. We will do it again on the next drop.',
      },
      'demo-1': {
        mensagem:
          'I talk about workout routine without miracle promises. The people who follow me trust what I recommend.',
        recompensaValor: 'R$ 280.00',
        recompensaNota: 'Bank transfer agreed for the 15th.',
        entregaLegenda: 'Reel with this week workout routine.',
        resultadoNota: 'Engagement above the average of the other creators in the campaign.',
      },
      'demo-2': {
        mensagem: 'Weight training and eating well without a restrictive diet.',
        recompensaValor: 'R$ 450.00',
        recompensaNota: 'Bank transfer sent.',
        entregaLegenda: 'Carousel with the before and after of the eating routine.',
        resultadoNota: 'Highest number of coupons used among the approved creators.',
      },
      'demo-3': {
        mensagem: 'Street running and amateur marathons. I post the long run every Sunday.',
        recompensaValor: 'Whey kit 900g',
        recompensaNota: 'Shipped by mail.',
        entregaLegenda: 'Sequence of 3 stories on the Sunday long run.',
        resultadoNota: 'The people who follow them suit the campaign well, even in small numbers.',
      },
      'demo-4': {
        mensagem: 'Mobility and stretching. Short content, saved a lot.',
        recompensaValor: 'CAIO20 coupon (20% off)',
        recompensaNota: 'Valid for 60 days.',
        entregaLegenda: 'One minute video with the mobility series.',
        resultadoNota: 'Video saved a lot, good reactivation of older followers.',
      },
    },
  },
} satisfies Dictionary;
