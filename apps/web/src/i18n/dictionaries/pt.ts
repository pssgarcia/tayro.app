// ─── Dicionário: português ───────────────────────────────────────────────────
// FONTE DE VERDADE do i18n. O `en.ts` é tipado contra este arquivo, então
// chave nova aqui vira ERRO DE COMPILAÇÃO lá até ser traduzida — é o que
// impede a versão em inglês de apodrecer em silêncio.
//
// Escopo desta leva: a landing (`/`) e o que ela renderiza. O resto do produto
// segue em português, com a copy nos próprios componentes. Ver `README` do
// diretório.
//
// String parametrizada é FUNÇÃO, não template com placeholder: o argumento
// fica tipado e a ordem das palavras pode mudar entre idiomas sem gambiarra.

import { ptApp } from './pt.app';

export const pt = {
  /** Produto (painéis, auth, telas públicas). Em arquivo separado por tamanho. */
  app: ptApp,

  idioma: {
    /** Rótulo do seletor, no idioma que ele seleciona. */
    nome: 'Português',
    curto: 'PT',
    alternar: 'Trocar idioma',
  },

  // Título e descrição da ABA do navegador. O `index.html` é estático (SPA sem
  // SSR), então ele carrega a versão em português e o idioma ativo corrige em
  // tempo de execução. Isso serve quem está lendo a página; NÃO serve crawler
  // (WhatsApp, Google), que lê o HTML servido e nunca executa o JS. Preview em
  // inglês exigiria SSR ou pré-render, e isso não está no escopo.
  meta: {
    titulo: 'Tayro | a plataforma de creators pra marca que decide na mão',
    descricao:
      'A plataforma pra marca que já recebe candidatura de creator e decide na mão. Cada candidatura chega com o Instagram real da creator do lado do botão de aprovar.',
  },

  comum: {
    pularParaConteudo: 'Pular para o conteúdo',
    /** Nome acessível da logo do header, que ancora de volta no topo. */
    voltarAoTopo: 'TAYRO, voltar ao topo',
    conta: 'Conta',
    entrar: 'Entrar',
    criarConta: 'Criar conta',
    aprovar: 'Aprovar',
    recusar: 'Recusar',
    pendente: 'Pendente',
    aprovada: 'Aprovada',
  },

  hero: {
    kicker: 'Plataforma para marcas',
    tituloLinha1: 'Decidir com quem trabalhar deve levar minutos,',
    tituloLinha2: 'não uma tarde no Instagram.',
    /** O nome da marca é montado no JSX (o "RO" sai em lime), então entra partido. */
    descricaoAntes: 'O ',
    descricaoDepois:
      ' é a plataforma pra marca que já recebe candidatura de creator e decide na mão. Cada candidatura chega com o Instagram real da creator do lado do botão de aprovar.',
    ctaConversar: 'Quero conversar',
    ctaCampanhas: 'Ver campanhas abertas',
    ressalvaFicticia: 'Creator fictícia · imagem gerada',
  },

  problema: {
    titulo: 'o problema',
    itens: [
      {
        kicker: 'a entrada',
        texto: 'A candidatura chega por DM e por formulário, e se perde no meio das outras.',
      },
      {
        kicker: 'a avaliação',
        texto: 'Pra decidir, você abre o Instagram de cada uma na mão, uma tarde inteira.',
      },
      {
        kicker: 'o controle',
        texto: 'O resto vira planilha e WhatsApp, e no fim do mês ninguém sabe o que funcionou.',
      },
    ],
  },

  como: {
    titulo: 'como funciona',
    passo: (n: number) => `passo ${String(n).padStart(2, '0')}`,
    passos: [
      'Publique a campanha com a oferta já definida: valor, tipo e prazo. Todo mundo vê o mesmo antes de se candidatar.',
      'Divulgue o link. A creator se candidata sem precisar criar conta antes. A conta nasce depois.',
      'Decida com o Instagram real dela do lado do botão: seguidores, engajamento calculado e os últimos posts, atualizados sozinhos.',
    ],
    /** Etiqueta no canto de cada miniatura de UI. */
    cantos: { campanha: 'campanha', link: 'link', fila: 'fila' },
    campanhaAtiva: 'campanha ativa',
    oferta: 'oferta',
    prazo: 'prazo',
    vagas: 'vagas',
    dias: (n: number) => `${n} dias`,
    publicar: 'Publicar',
    copiarLink: 'Copiar link',
  },

  produto: {
    titulo: 'a parceria dentro do produto',
    descricao:
      'Da candidatura ao resultado, nas mesmas abas que a marca usa. Aprove uma candidatura e acompanhe a parceria virar recompensa registrada, conteúdo em revisão e o resultado que fica no histórico da creator.',
    abas: {
      fila: 'Fila',
      recompensas: 'Recompensas',
      conteudos: 'Conteúdos',
      resultado: 'Resultado',
    },
    ressalva: 'Creators fictícias · imagens geradas · dados de demonstração',
    recomecar: 'Recomeçar demonstração',
  },

  fila: {
    candidaturas: 'candidaturas',
    seguidores: 'seguidores',
    engajamento: 'engajamento',
    postsRecentes: 'posts recentes',
    mensagemDaCandidatura: 'mensagem da candidatura',
    /** Linha da lista: "@handle · 12,4k seguidores". */
    meta: (handle: string, seguidores: string) => `@${handle} · ${seguidores} seguidores`,
    decidida: (decisao: string) => `candidatura ${decisao}`,
    decisaoAprovada: 'aprovada',
    decisaoRecusada: 'recusada',
    status: {
      PENDING: 'Pendente',
      APPROVED: 'Aprovada',
      REJECTED: 'Recusada',
      WITHDRAWN: 'Retirada',
    },
  },

  story: {
    progresso: (atual: number, total: number) => `${atual} de ${total}`,
    anterior: 'Candidatura anterior',
    proxima: 'Próxima candidatura',
    seguidores: 'Seguidores',
    engajamento: 'Engajamento',
    ofertaDaCampanha: 'Oferta da campanha',
    verPosts: 'Ver posts',
    fecharPosts: 'Fechar posts',
    fimDaFila: 'fim da fila',
    fimDaFilaTitulo: 'Nenhuma candidatura esperando decisão.',
    reverFila: 'Rever a fila',
  },

  recompensas: {
    vazio:
      'Nenhuma recompensa ainda. Aprove uma candidatura na Fila e a recompensa dela aparece aqui.',
    marcarEmitida: 'Marcar como emitida',
    confirmarEntrega: 'Confirmar entrega',
    tipo: {
      MONETARY: 'Monetária',
      PRODUCT: 'Produto',
      DISCOUNT: 'Desconto',
    },
    status: {
      PENDING: 'Pendente',
      ISSUED: 'Emitida',
      DELIVERED: 'Entregue',
    },
  },

  conteudos: {
    vazio:
      'Nenhum conteúdo ainda. Depois de aprovada, a creator envia a entrega pelo próprio TAYRO e ela chega aqui para revisão.',
    legendaEnviada: 'legenda enviada',
    revisao: 'Revisão',
    tipo: {
      REEL: 'Reel',
      VIDEO: 'Vídeo',
      IMAGE: 'Foto',
      STORY: 'Story',
    },
    status: {
      PENDING: 'Em análise',
      APPROVED: 'Aprovado',
      REJECTED: 'Recusado',
      REVISION_REQUESTED: 'Revisar',
    },
  },

  resultado: {
    vazio:
      'Nenhuma parceria aprovada ainda. Aprove uma candidatura na Fila e o resultado dela aparece aqui pra ser informado.',
    // A ressalva de honestidade: o número é DECLARADO pela marca. Sem ela a
    // seção viraria exatamente a métrica fabricada que a vision.md nº 5 proíbe.
    ressalva:
      'Os números são informados pela marca. O tayro não mede alcance nem impressão. Eles aparecem pra creator sempre, e no perfil público dela só quando a marca libera.',
    convite:
      'Você ainda não informou o que esta parceria deu. É o que transforma a candidatura aprovada em histórico da creator.',
    informar: 'Informar resultado',
    alcance: 'Alcance',
    impressoes: 'Impressões',
    cupons: 'Cupons',
    atribuicao: 'Informado pela marca · aparece no perfil público dela',
    status: {
      PENDING: 'A informar',
      REGISTERED: 'Informado',
    },
  },

  doisLados: {
    titulo: 'os dois lados da parceria',
    descricao:
      'A marca cria a oportunidade e a creator encontra. Cada uma vê a sua parte da mesma campanha, do primeiro anúncio ao resultado que vira histórico dela.',
    marca: 'marca',
    marcas: 'marcas',
    creator: 'creator',
    creators: 'creators',
    marcaTitulo: 'Encontre quem faz sentido.',
    marcaDescricao:
      'Publique a campanha com a oferta definida, receba as candidaturas e decida com o Instagram de cada uma na mesma tela.',
    creatorTitulo: 'Encontre oportunidades que fazem sentido pra você.',
    creatorDescricao:
      'Veja o valor, o tipo e o prazo antes de se candidatar, acompanhe a decisão e envie o conteúdo pelo mesmo lugar.',
    candidaturasRecebidas: 'candidaturas recebidas',
    minhasCandidaturas: 'minhas candidaturas',
    aOferta: 'A oferta',
    marcaEVagas: (vagas: number) => `Marca · ${vagas} vagas`,
    nVagas: (vagas: number) => `${vagas} vagas`,
    enviarConteudo: 'Enviar conteúdo',
    ofertaEPrazo: (oferta: string, dias: number) => `${oferta} · ${dias} dias`,
    ciclo: [
      'Publica a campanha com a oferta definida',
      'Encontra a campanha aberta e vê a oferta',
      'Se candidata pelo link',
      'Decide com o Instagram da creator do lado',
      'Registra a recompensa da parceria',
      'Envia o conteúdo combinado',
      'Recebe e revisa o conteúdo',
      'Informa o resultado da parceria',
      'Vê o resultado no histórico do seu perfil',
    ],
  },

  cta: {
    titulo: 'Quer ver se resolve o seu caso?',
    descricao:
      'Conta como você trabalha com creators hoje. Se o TAYRO encaixar, a gente te mostra rodando, sem apresentação de vendas.',
  },

  rodape: {
    nav: 'Rodapé',
    entrar: 'Entrar',
    criarContaMarca: 'Criar conta de marca',
    campanhasAbertas: 'Campanhas abertas',
    termos: 'Termos de uso',
    privacidade: 'Privacidade',
    direitos: (ano: number) => `© ${ano} TAYRO. Todos os direitos reservados.`,
  },

  // Conteúdo da demonstração. Nomes e @ ficam fora (nome próprio não se
  // traduz); o que é FRASE entra aqui, senão a landing em inglês mostraria
  // uma fila inteira de mensagens em português.
  demo: {
    campanha: 'Creators de Verão',
    creators: {
      'demo-hero': {
        mensagem:
          'Treino em casa e falo muito sobre rotina real, sem estética de academia. Meu público é quase todo mulher de 25 a 34.',
        recompensaValor: 'R$ 300,00',
        recompensaNota: 'Pix combinado para o dia 15.',
        entregaLegenda: 'Minha rotina de treino em casa em 30 segundos.',
        resultadoNota: 'Melhor entrega da campanha. Vamos repetir no próximo drop.',
      },
      'demo-1': {
        mensagem:
          'Falo de rotina de treino sem promessa milagrosa. Meu público confia bastante no que eu indico.',
        recompensaValor: 'R$ 280,00',
        recompensaNota: 'Pix combinado para o dia 15.',
        entregaLegenda: 'Reel com a rotina de treino da semana.',
        resultadoNota: 'Engajamento acima da média das outras creators da campanha.',
      },
      'demo-2': {
        mensagem: 'Musculação e alimentação sem dieta restritiva.',
        recompensaValor: 'R$ 450,00',
        recompensaNota: 'Pix enviado.',
        entregaLegenda: 'Carrossel com o antes e depois da rotina alimentar.',
        resultadoNota: 'Maior número de cupons usados entre as creators aprovadas.',
      },
      'demo-3': {
        mensagem: 'Corrida de rua e maratona amadora. Posto treino longo todo domingo.',
        recompensaValor: 'Kit Whey 900g',
        recompensaNota: 'Envio pelos Correios.',
        entregaLegenda: 'Sequência de 3 stories no treino longo de domingo.',
        resultadoNota: 'Público bem alinhado com a campanha, mesmo com poucos seguidores.',
      },
      'demo-4': {
        mensagem: 'Mobilidade e alongamento. Conteúdo curto, muito salvamento.',
        recompensaValor: 'Cupom CAIO20 (20% off)',
        recompensaNota: 'Válido por 60 dias.',
        entregaLegenda: 'Vídeo de 1 minuto com a série de mobilidade.',
        resultadoNota: 'Vídeo salvo bastante, boa reativação de seguidor antigo.',
      },
    },
  },
};

/** A forma do dicionário. `en.ts` é checado contra isto. */
export type Dictionary = typeof pt;
