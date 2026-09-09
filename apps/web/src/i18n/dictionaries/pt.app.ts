// ─── Dicionário do PRODUTO: português ────────────────────────────────────────
// Separado do `pt.ts` (a landing) só por tamanho: os dois são compostos em
// `pt.ts` e formam um dicionário só, acessado por `t.app.*`.
//
// FONTE DE VERDADE. O `en.app.ts` é tipado contra este arquivo.
//
// O que NÃO está aqui, de propósito:
//  · o TEXTO dos documentos legais (`TermsOfUsePage`, `PrivacyPolicyPage`) —
//    é peça jurídica, o aceite grava versão sem guardar idioma, e traduzir
//    texto legal não é trabalho de engenharia;
//  · mensagem de erro vinda da API e corpo de e-mail — nascem no servidor,
//    em português. Ver `i18n/README.md`.

export const ptApp = {
  // ── Vocabulário de status ────────────────────────────────────────────────
  // Seis listas, não uma: o mesmo enum é dito de formas diferentes conforme
  // quem lê e o gênero da palavra que ele qualifica. Manter separado é
  // deliberado (ver comentários em `utils/format.ts`).
  status: {
    /** Candidatura: feminino, concorda com "candidatura". */
    application: {
      PENDING: 'Pendente',
      APPROVED: 'Aprovada',
      REJECTED: 'Recusada',
      WITHDRAWN: 'Retirada',
    },
    /** Campanha: feminino. */
    campaign: {
      DRAFT: 'Rascunho',
      ACTIVE: 'Ativa',
      CLOSED: 'Encerrada',
      COMPLETED: 'Concluída',
    },
    /** Conteúdo: MASCULINO. Por isso "Aprovado", não "Aprovada". */
    content: {
      PENDING: 'Em análise',
      APPROVED: 'Aprovado',
      REJECTED: 'Recusado',
      REVISION_REQUESTED: 'Revisar',
    },
    /** Recompensa, da ótica da MARCA: trabalho que ela fez ou não fez. */
    reward: {
      PENDING: 'Pendente',
      ISSUED: 'Emitida',
      DELIVERED: 'Entregue',
    },
    /** O MESMO status, da ótica da creator: dinheiro que chegou ou não. */
    creatorReward: {
      PENDING: 'A receber',
      ISSUED: 'A caminho',
      DELIVERED: 'Entregue',
    },
    /** Derivado, não é enum do banco: a marca informou o resultado ou deve. */
    partnershipResult: {
      PENDING: 'A informar',
      REGISTERED: 'Informado',
    },
  },

  // ── Formatação ───────────────────────────────────────────────────────────
  format: {
    semPrazo: 'Sem prazo',
    porVenda: 'por venda',
    produto: 'produto',
    hoje: 'hoje',
    haUmDia: 'há 1 dia',
    haDias: (n: number) => `há ${n} dias`,
    telefoneInvalido: 'Telefone inválido: use apenas números, espaços, ( ) - ou +',
  },

  // ── Navegação ────────────────────────────────────────────────────────────
  nav: {
    sair: 'Sair',
    marca: {
      dashboard: 'Leitura',
      creators: 'Creators',
      campanhas: 'Campanhas',
      perfil: 'Marca',
    },
    creator: {
      dashboard: 'Leitura',
      abertos: 'Abertos',
      registro: 'Registro',
      entregas: 'Entregas',
      perfil: 'Perfil',
    },
    documentosLegais: 'Documentos legais',
    /**
     * Rótulo dos documentos legais nos LINKS do produto. Separado do
     * `TERMS_LABEL`/`PRIVACY_LABEL` de `config/legal.ts`, que continua em
     * português fixo porque é citado DENTRO do texto jurídico (25 vezes).
     * Em inglês estes dizem "(in Portuguese)": o documento existe só em
     * português e é a versão que vale.
     */
    /**
     * Aviso mostrado APENAS em inglês na moldura dos documentos legais: eles
     * existem só em português e é essa a versão que vale. O valor em português
     * nunca é renderizado (a condição não dispara), mas existe porque o
     * dicionário tem forma única nos dois idiomas.
     */
    documentoSoEmPortugues:
      'Este documento existe apenas em português, e é essa a versão que vale.',
    termos: 'Termos de Uso',
    privacidade: 'Política de Privacidade',
  },

  // ── Ações e rótulos repetidos em várias telas ────────────────────────────
  acoes: {
    voltar: 'Voltar',
    continuar: 'Continuar',
    cancelar: 'Cancelar',
    salvar: 'Salvar',
    salvando: 'Salvando…',
    entrar: 'Entrar',
    verificando: 'Verificando…',
    mostrarSenha: 'Mostrar senha',
    ocultarSenha: 'Ocultar senha',
  },

  // ── Mensagens de validação de formulário ─────────────────────────────────
  // Compartilhadas pelos 12 formulários do produto. Ficam aqui e não soltas em
  // cada schema porque o schema passou a ser função do dicionário: mensagem
  // fixa no módulo congelaria no idioma do boot.
  validacao: {
    nomeObrigatorio: 'Nome obrigatório',
    max100: 'Máximo 100 caracteres',
    max30: 'Máximo 30 caracteres',
    max72: 'Máximo 72 caracteres',
    emailInvalido: 'E-mail inválido',
    emailLongo: 'E-mail muito longo',
    senhaMin: 'Mínimo 8 caracteres',
    telefoneObrigatorio: 'Telefone obrigatório',
    telefoneLongo: 'Telefone muito longo',
    handleObrigatorio: '@ do Instagram obrigatório',
    handleInvalido: 'Handle inválido: só letras, números, . e _',
    aceiteObrigatorio: 'É necessário aceitar os Termos de Uso e a Política de Privacidade',
    maioridadeObrigatoria: 'É necessário declarar que você tem 18 anos ou mais',
    valorInvalido: 'Valor inválido.',
  },

  // ── Erros de rede e de servidor ──────────────────────────────────────────
  erros: {
    inesperado: 'Erro inesperado. Tente novamente.',
    // "Sem conexão" SÓ quando a request não chegou ao servidor. Erro com
    // resposta HTTP nunca deve falar em conexão.
    semConexao: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    muitasTentativas: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    naoFoiPossivelCriarConta: 'Não foi possível criar a conta. Tente novamente.',
  },

  // ── Verificação do @ do Instagram (D-19) ─────────────────────────────────
  handleCheck: {
    encontrado: 'Perfil encontrado no Instagram',
    // UNKNOWN LIBERA o envio: acusar falsamente custa mais que deixar passar
    // um typo. A copy precisa dizer isso, não parecer erro.
    incerto: 'Não deu para confirmar agora. Você pode continuar',
    naoEncontrado: 'Usuário não encontrado no Instagram. Confira o @',
  },

  // ── Cadastro de creator ──────────────────────────────────────────────────
  cadastroCreator: {
    titulo: 'Criar sua conta',
    subtitulo: 'Leva 1 minuto. Depois você já vê as campanhas abertas.',
    passos: { identidade: 'Identidade', acesso: 'Acesso', nichos: 'Nichos' },
    nome: 'Nome',
    nomePlaceholder: 'Ana Silva',
    telefone: 'Telefone',
    telefonePlaceholder: '(11) 91234-5678',
    handle: '@ do Instagram',
    email: 'E-mail',
    emailPlaceholder: 'voce@email.com',
    senha: 'Senha',
    senhaHint: 'Mínimo 8 caracteres',
    seusNichos: 'Seus nichos',
    criarConta: 'Criar conta',
    criandoConta: 'Criando conta…',
    jaTemConta: 'Já tem conta?',
  },

  // ── Nichos ───────────────────────────────────────────────────────────────
  // O VALOR é canônico e fica em português em qualquer idioma: ele é gravado
  // no perfil da creator e usado como filtro de campanha (`?niches=`), então
  // traduzir o valor faria a creator parar de casar com a campanha. Aqui é só
  // como o nicho é ESCRITO na tela.
  nichos: {
    fitness: 'fitness',
    wellness: 'wellness',
    'musculação': 'musculação',
    crossfit: 'crossfit',
    yoga: 'yoga',
    corrida: 'corrida',
    'nutrição': 'nutrição',
    'moda fitness': 'moda fitness',
    'suplementação': 'suplementação',
    lifestyle: 'lifestyle',
  },

  // ── Aceite legal ─────────────────────────────────────────────────────────
  aceite: {
    liEConcordo: 'Li e concordo com os',
    eComA: 'e com a',
    maioridade: 'Declaro que tenho 18 anos ou mais.',
  },

  // ── Modais de conta ──────────────────────────────────────────────────────
  trocarSenha: {
    titulo: 'Trocar senha',
    senhaAtual: 'Senha atual',
    novaSenha: 'Nova senha',
    trocando: 'Trocando…',
    sucesso: 'Senha alterada. Outros dispositivos logados precisarão entrar de novo.',
    informeSenhaAtual: 'Informe a senha atual',
    senhaAtualIncorreta: 'Senha atual incorreta.',
    deveSerDiferente: 'A nova senha deve ser diferente da atual.',
    naoFoiPossivel: 'Não foi possível trocar a senha. Tente novamente.',
  },
  trocarEmail: {
    titulo: 'Trocar e-mail',
    novoEmail: 'Novo e-mail',
    senhaAtual: 'Senha atual',
    trocando: 'Trocando…',
    sucesso: 'E-mail alterado. Mandamos um aviso pro endereço antigo.',
    informeSenhaAtual: 'Informe a senha atual',
    emailEmUso: 'Este e-mail já está em uso',
    senhaIncorreta: 'Senha incorreta.',
    jaEhSeuEmail: 'Este já é o seu e-mail.',
    naoFoiPossivel: 'Não foi possível trocar o e-mail. Tente novamente.',
  },
  apagarConta: {
    titulo: 'Apagar minha conta',
    consequencia:
      'Seu perfil, foto, nichos e telefone são apagados. Candidaturas e recompensas continuam existindo para as marcas, sem seu nome. Isso não pode ser desfeito.',
    informeSenha: 'Informe a senha atual.',
    senhaIncorreta: 'Senha incorreta.',
    naoFoiPossivel: 'Não foi possível apagar a conta. Tente novamente.',
    apagando: 'Apagando…',
    resumo: 'Irreversível. Seus dados de identificação são removidos.',
    meusDados: 'Meus dados',
  },

  // ── Diversos compartilhados ──────────────────────────────────────────────
  comum: {
    fechar: 'Fechar',
    editar: 'Editar',
    copiado: 'Copiado!',
    copiarLink: 'Copiar link',
  },

  erroBoundary: {
    titulo: 'Algo quebrou nesta tela.',
    descricao:
      'O erro foi registrado. Tenta recarregar. Se continuar, volta daqui a pouco.',
    recarregar: 'Recarregar',
  },

  // ── Autenticação ─────────────────────────────────────────────────────────
  login: {
    titulo: 'Que bom te ver',
    tituloDestaque: 'de novo.',
    emailPlaceholder: 'seu@email.com',
    senhaObrigatoria: 'Senha obrigatória',
    credenciaisInvalidas: 'Email ou senha incorretos',
    erroConexao: 'Erro de conexão. Tente novamente.',
    esqueciSenha: 'Esqueci minha senha',
    naoTemConta: 'Não tem conta?',
    entrando: 'Entrando…',
    cadastreSe: 'Cadastre-se',
    verCampanhas: 'Ver campanhas abertas',
  },
  escolherPapel: {
    titulo: 'Como você quer',
    tituloDestaque: 'começar?',
    souCreator: 'Sou creator',
    creatorDescricao: 'Encontre campanhas abertas e feche parcerias com marcas.',
    criarContaCreator: 'Criar conta de creator',
    souMarca: 'Sou marca',
    marcaDescricao: 'Crie campanhas e receba candidaturas.',
    criarContaMarca: 'Criar conta de marca',
    jaTemConta: 'Já tem conta?',
  },
  cadastroMarca: {
    titulo: 'Criar conta',
    tituloDestaque: 'da marca',
    subtitulo: 'Depois disso você já publica a primeira campanha.',
    passos: { identidade: 'Identidade', acesso: 'Acesso', nichos: 'Nichos' },
    nome: 'Nome da marca',
    nomePlaceholder: 'Minha Marca Fitness',
    nomeObrigatorio: 'Nome da marca obrigatório',
    website: 'Website (opcional)',
    websitePlaceholder: 'https://suamarca.com',
    urlInvalida: 'URL inválida (inclua https://)',
    emailPlaceholder: 'voce@suamarca.com',
    nichosDaMarca: 'Nichos da marca',
    souCreator: 'Sou creator',
    emailEmUso: 'Já existe uma conta com esse e-mail',
    verifiqueDados: 'Verifique os dados e tente novamente.',
    erroConexao: 'Erro de conexão. Tente novamente.',
  },
  esqueciSenha: {
    titulo: 'Esqueceu',
    tituloDestaque: 'a senha?',
    subtitulo: 'Informe seu e-mail e mandamos um link para você definir uma senha nova.',
    // Resposta sempre genérica: nunca revela se o e-mail existe na base.
    enviado:
      'Se esse e-mail existir na nossa base, enviamos um link de recuperação. Confira sua caixa de entrada.',
    enviando: 'Enviando…',
    enviarLink: 'Enviar link',
    naoFoiPossivel: 'Não foi possível enviar o link. Tente novamente.',
  },
  redefinirSenha: {
    titulo: 'Nova',
    tituloDestaque: 'senha.',
    subtitulo: 'Escolha uma senha nova para acessar sua conta.',
    novaSenha: 'Nova senha',
    redefinindo: 'Redefinindo…',
    redefinir: 'Redefinir senha',
    linkSemToken: 'Link inválido: falta o token de acesso. Confira o link do e-mail.',
    linkExpirado: 'Este link expirou ou já foi utilizado. Peça um novo abaixo.',
    pedirNovoLink: 'Pedir um novo link',
    linkInvalidoPergunta: 'Link inválido ou expirado?',
    naoFoiPossivel: 'Não foi possível redefinir sua senha. Tente novamente.',
  },
  ativarConta: {
    titulo: 'Falta só',
    tituloDestaque: 'a senha.',
    subtitulo: 'Falta só isso para acessar sua conta e acompanhar suas candidaturas.',
    comCandidatura: (campanha: string) =>
      `Sua candidatura ao ${campanha} já foi enviada. Crie uma senha para acompanhar a resposta.`,
    criarSenha: 'Criar senha',
    ativando: 'Ativando…',
    ativar: 'Ativar minha conta',
    linkSemToken: 'Link inválido: falta o token de acesso. Confira o link do e-mail.',
    linkExpirado:
      'Este link expirou ou já foi utilizado. Peça um novo aplicando-se novamente a uma campanha.',
    naoFoiPossivel: 'Não foi possível definir sua senha. Tente novamente.',
    linkInvalidoPergunta: 'Link inválido ou expirado?',
    entrarComEmail: 'Entrar com e-mail',
  },

  // ── Telas da creator ─────────────────────────────────────────────────────
  creator: {
    dashboard: {
      titulo: 'Sua leitura',
      nenhumaCandidatura: 'Nenhuma candidatura ainda.',
      registro: 'Registro',
      explorar: 'Explore as campanhas',
      emAnalise: 'em análise',
      aReceber: 'a receber',
      pagina: (n: number, total: number) => `Página ${n} de ${total}`,
    },
    registro: {
      titulo: 'Registro',
      erro: 'Erro ao carregar suas candidaturas. Tente novamente.',
      explorar: 'Explore as campanhas',
      vazioComFiltro: 'Nenhuma candidatura com esse status.',
      abas: {
        ALL: 'Todas',
        PENDING: 'Pendentes',
        APPROVED: 'Aprovadas',
        REJECTED: 'Recusadas',
      },
      ultimaCandidatura: 'Última candidatura',
      precisaDeVoce: 'Precisa de você',
      aReceberDepois: 'a receber depois que o conteúdo for aprovado',
      aguardandoResposta: 'aguardando resposta da marca',
      enviarConteudo: 'Enviar conteúdo',
      retirar: 'Retirar',
      retirarTitulo: 'Retirar candidatura?',
      retirarConfirmar: 'Retirar candidatura',
      retirando: 'Retirando…',
      retirarErro: 'Não foi possível retirar. Tente novamente.',
      retirarAntes: 'Sua candidatura para',
      retirarDepois: (marca: string) =>
        `sai da fila de ${marca}. Você não poderá se candidatar de novo a esta campanha.`,
      semCandidatura: 'Você ainda não se candidatou a nenhuma campanha.',
    },
    entregas: {
      titulo: 'Entregas',
      enviados: 'Enviados',
      erro: 'Erro ao carregar. Tente novamente.',
      vazio:
        'Nenhum conteúdo enviado ainda. Quando você tiver uma candidatura aprovada, envie o link do seu conteúdo aqui.',
      enviarConteudo: 'Enviar conteúdo',
      verCandidaturas: 'Ver candidaturas',
      semAprovadas: 'Você não tem candidaturas aprovadas no momento.',
      candidaturaAprovada: 'Candidatura aprovada *',
      selecione: 'Selecione…',
      selecioneAprovada: 'Selecione uma candidatura aprovada',
      linkConteudo: 'Link do conteúdo *',
      linkPlaceholder: 'https://instagram.com/reel/...',
      tipoConteudo: 'Tipo de conteúdo *',
      legenda: 'Legenda (opcional)',
      legendaPlaceholder: 'Cole aqui a legenda do post…',
      urlInvalida: 'URL inválida: inclua https://',
      urlLonga: 'URL muito longa',
      legendaMax: 'Máximo 2200 caracteres',
      naoEhSua: 'Essa candidatura não é sua ou não está aprovada.',
      naoFoiPossivel: 'Não foi possível enviar. Tente novamente.',
      enviar: 'Enviar',
      enviando: 'Enviando…',
      verAtual: 'Ver atual',
      reenviarLink: 'Reenviar link',
      enviarNovo: 'Enviar novo conteúdo',
      pediuAjuste: 'A marca pediu ajuste',
      precisaDeVoce: 'Precisa de você',
      tipos: { REEL: 'Reel', VIDEO: 'Vídeo', IMAGE: 'Foto', STORY: 'Story' },
    },
    recompensas: {
      titulo: 'Recompensas',
      subtitulo: 'Tudo que você ganhou e tem a receber',
      erro: 'Erro ao carregar. Tente novamente.',
      vazioTitulo: 'Nenhuma recompensa ainda',
      vazio: 'Suas recompensas aparecem aqui após a marca registrá-las.',
      tipos: { MONETARY: 'Pagamento', PRODUCT: 'Produto', DISCOUNT: 'Desconto' },
    },
    perfil: {
      titulo: 'Perfil',
      erro: 'Erro ao carregar o perfil. Tente novamente.',
      previaTitulo: 'Prévia do que a marca vê',
      previaLegenda: 'É exatamente isso que a marca vê.',
      telefoneNaoInformado: 'Telefone não informado',
      nome: 'Nome',
      cidade: 'Cidade',
      telefone: 'Telefone',
      foto: 'Foto (URL)',
      fotoPlaceholder: 'https://cdn.exemplo.com/voce.png',
      tiktok: 'TikTok',
      bio: 'Bio',
      bioPlaceholder: 'Fale um pouco sobre você para as marcas.',
      nichos: 'Nichos',
      perfilPublico: 'Perfil público',
      tornarPublico: 'Tornar meu perfil público',
      adicioneHandle: (endereco: string) =>
        `Adicione seu @ do Instagram para ganhar um endereço em ${endereco}.`,
      ativeParaMarcas: (endereco: string) =>
        `Ative para as marcas encontrarem você em ${endereco}.`,
      salvo: 'Salvo',
      bioMax: 'Máximo 500 caracteres',
      urlInvalida: 'URL inválida (inclua https://)',
      muitasTentativas: 'Muitas tentativas. Aguarde alguns minutos.',
      naoFoiPossivelSalvar: 'Não foi possível salvar. Tente novamente.',
    },
    abertos: {
      titulo: 'Abertos',
      todosAbertos: 'Todos os abertos',
      erro: 'Erro ao carregar as campanhas. Tente novamente.',
      vazio: 'Nenhuma campanha aberta agora. Volte em breve.',
      aOferta: 'A oferta',
      marca: 'Marca',
      vagas: (n: number) => `${n} vaga${n !== 1 ? 's' : ''}`,
    },
    detalheCampanha: {
      naoEncontrada: 'Campanha não encontrada',
      naoEncontradaDescricao: 'Ele pode ter sido encerrado ou o link está desatualizado.',
      verCampanhas: 'Ver campanhas abertas',
      campanhaDe: 'Campanha de',
      oQueRecebe: 'O que você recebe',
      sobre: 'Sobre a campanha',
      verBriefing: 'Ver briefing completo',
      verCandidatura: 'Ver candidatura',
      encerradas: 'Inscrições encerradas para esta campanha.',
      participar: 'Quero participar',
      inscricoesAte: (data: string) => `Inscrições até ${data}`,
      jaSeCandidatou: 'Você já se candidatou a esta campanha.',
      produtoEnviado: 'produto enviado para você',
      porCandidaturaAprovada: 'por candidatura aprovada',
      diasAteEnvio: 'dias até o envio',
      diasAtePagamento: 'dias até o pagamento',
    },
    candidatar: {
      titulo: 'Quero participar',
      enviada: 'Candidatura enviada',
      vaiAnalisar: 'vai analisar seu perfil.',
      jaSeCandidatou: 'Você já se candidatou a esta campanha.',
      naoFoiPossivel: 'Não foi possível enviar sua candidatura. Tente novamente.',
      mensagem: 'Mensagem para a marca (opcional)',
      mensagemPlaceholder: 'Por que você é ideal para essa campanha?',
      verMinhas: 'Ver minhas candidaturas',
      confirmar: 'Confirmar',
      enviando: 'Enviando…',
    },
    resultados: {
      titulo: 'Resultados das parcerias',
      alcance: 'Alcance',
      impressoes: 'Impressões',
      cuponsUsados: 'Cupons usados',
      apareceNoPerfil: 'Aparece no seu perfil público.',
      escondido: 'Escondido do seu perfil público.',
      ocultar: 'Ocultar do meu perfil',
      mostrar: 'Mostrar no meu perfil',
      // Guarda contra promessa falsa: com o perfil público desligado,
      // /c/:handle devolve 404, então "aparece no seu perfil" seria mentira.
      perfilDesligado: 'Seu perfil público está desligado, então ninguém vê este resultado ainda.',
      ligarNoPerfil: 'Ligar no Perfil',
      naoLiberou: (marca: string) =>
        `${marca} não liberou este resultado para o seu perfil público. Ele fica só entre vocês.`,
      naoFoiPossivelSalvar: 'Não foi possível salvar. Tente novamente.',
      salvando: 'Salvando…',
    },
  },

  // ── Telas públicas (fora de guard) ───────────────────────────────────────
  publico: {
    candidatura: {
      naoEncontrada: 'Campanha não encontrada',
      naoEncontradaDescricao: 'O link pode estar desatualizado ou a campanha foi encerrada.',
      campanhaDe: 'Campanha de',
      aMarca: 'A marca',
      enviada: 'Candidatura enviada',
      decisaoPorEmail: 'Você recebe a decisão por e-mail.',
      seAprovada: 'Se a candidatura for aprovada, os detalhes da parceria chegam por lá.',
      oQueRecebe: 'O que você recebe',
      encerradas: 'Inscrições encerradas para esta campanha.',
      participar: 'Quero participar',
      levaUmMinuto: 'Leva menos de 1 minuto.',
      inscricoesAte: (data: string) => `Inscrições até ${data}`,
      handle: 'Seu @ do Instagram',
      handleObrigatorio: 'Informe seu @ do Instagram',
      handleLongo: 'Handle muito longo',
      email: 'E-mail',
      nome: 'Seu nome',
      nomePlaceholder: 'Como você se chama?',
      nomeLongo: 'Nome muito longo',
      telefone: 'Telefone',
      mensagem: 'Mensagem para a marca (opcional)',
      mensagemPlaceholder: 'Por que você é ideal para essa campanha?',
      enviando: 'Enviando…',
      jaSeCandidatou: 'Você já se candidatou ou este e-mail já está em uso.',
      algoDeuErrado: 'Algo deu errado. Verifique os dados e tente novamente.',
      // Aviso de tratamento de dado pessoal: a candidatura CRIA conta e manda
      // o @ para um terceiro. Precisa ser dito antes do envio, não depois.
      avisoDados:
        'Ao enviar sua candidatura, uma conta de creator no TAYRO é criada com os dados acima (ou a sua conta existente é usada), e você recebe um e-mail para definir a senha. Os dados públicos do seu perfil do Instagram passam a ser consultados e exibidos para a marca desta campanha.',
      produtoEnviado: 'produto enviado para você',
      diasAteEnvio: 'dias até o envio',
      diasAtePagamento: 'dias até o pagamento',
    },
    perfilCreator: {
      indisponivel: 'Este perfil não está disponível',
      indisponivelDescricao: 'O link pode estar incorreto ou o perfil não é público.',
      igIndisponivel: 'Dados do Instagram indisponíveis no momento.',
      conteudoRecente: 'Conteúdo recente',
      historico: 'Histórico de parcerias',
      parceriasConcluidas: 'parcerias concluídas',
      // A regra de cálculo é dita na própria página (vision.md nº 5): número
      // de reputação sem regra pública é métrica fabricada.
      regraContagem:
        'Conta candidatura aprovada com conteúdo aprovado pela marca ou com resultado informado por ela.',
      alcance: 'Alcance',
      impressoes: 'Impressões',
      cuponsUsados: 'Cupons usados',
      falarWhatsApp: 'Falar no WhatsApp',
      crieCampanhaTitulo: 'Crie sua campanha no tayro',
      crieCampanha: 'Crie sua campanha',
    },
    vitrine: {
      titulo: 'Campanhas abertas',
    },
  },

  // ── Telas da marca ───────────────────────────────────────────────────────
  marca: {
    dashboard: {
      titulo: 'Sua leitura',
      erro: 'Erro ao carregar o dashboard. Tente novamente.',
      comecePorAqui: 'Comece por aqui',
      nenhumaCampanha: 'Nenhuma campanha ainda',
      nenhumaCampanhaDescricao:
        'Crie a primeira campanha para começar a receber candidaturas de creators.',
      criarPrimeiro: 'Criar o primeiro',
      precisaDeVoce: 'Precisa de você',
      analisarAgora: 'Analisar agora',
      resumo: 'Resumo',
      conteudosARevisar: 'conteúdos a revisar',
      candidaturasEsperando: (n: number) =>
        `candidatura${n !== 1 ? 's' : ''} esperando sua análise.`,
    },
    campanhas: {
      titulo: 'Campanhas',
      nova: 'Novo',
      erro: 'Erro ao carregar campanhas. Tente novamente.',
      vazio:
        'Você ainda não criou nenhuma campanha. Crie a primeira para começar a receber candidaturas.',
      abas: { ALL: 'Todas', ACTIVE: 'Ativas', DRAFT: 'Rascunho', CLOSED: 'Encerradas' },
      verDetalhes: 'Ver detalhes',
      encerraEm: (dias: number) => `Encerra em ${dias} dias`,
      vazioComFiltro: (rotulo: string) => `Nenhuma campanha com status "${rotulo}".`,
    },
    novaCampanha: {
      titulo: 'Nova campanha',
      salvarRascunho: 'Salvar rascunho',
      erro: 'Erro ao criar campanha. Verifique os campos e tente novamente.',
      publicada: 'Campanha publicada',
      compartilhe: 'Compartilhe o link abaixo para receber candidaturas.',
      publicarAgora: 'Publicar agora?',
      publicarAgoraDescricao:
        'Ao publicar, o link de candidatura fica ativo na hora e creators já podem se inscrever. Depois de publicada a campanha não volta para rascunho e os detalhes não podem mais ser editados. Se preferir, publique depois, pelo detalhe da campanha.',
      verCampanha: 'Ver campanha',
      agoraNao: 'Agora não',
    },
    editarCampanha: {
      titulo: 'Editar campanha',
      erroCarregar: 'Não foi possível carregar a campanha. Tente novamente.',
      // Só rascunho edita: quem se candidatou viu os termos publicados.
      jaPublicada:
        'Esta campanha já foi publicada e não pode mais ser editada. Quem se candidatou viu estes termos, e mudá-los agora quebraria o combinado.',
      voltarACampanha: 'Voltar à campanha',
      salvarAlteracoes: 'Salvar alterações',
      erroSalvar: 'Erro ao salvar as alterações. Verifique os campos e tente novamente.',
    },
    formulario: {
      aCampanha: 'A campanha',
      titulo: 'Título',
      tituloPlaceholder: 'Ex: Verão Fitness 2026',
      descricao: 'Descrição',
      descricaoPlaceholder:
        'O que você espera do conteúdo, que tipo de post quer, qual é a vibe da marca…',
      briefLink: 'Link do brief (opcional)',
      briefPlaceholder: 'https://drive.google.com/…',
      nichos: 'Nichos',
      vagas: 'Vagas',
      inscricoesAte: 'Inscrições até',
      aOferta: 'A oferta',
      ofertaLegenda: 'É a primeira coisa que quem se candidata lê.',
      tipos: { CASH: 'Dinheiro', PRODUCT: 'Produto', COMMISSION: 'Comissão' },
      valor: 'Valor (R$)',
      descricaoProduto: 'Descrição do produto',
      descricaoProdutoPlaceholder: 'Ex: Kit Whey 900g + coqueteleira da marca',
      comissao: 'Comissão (%)',
      prazoEnvio: 'Prazo p/ envio (dias)',
      prazoPagamento: 'Prazo p/ pagamento (dias)',
      previaOferta: 'Prévia da oferta',
      vagasAbertas: 'vagas abertas',
      min3: 'Mínimo 3 caracteres',
      min10: 'Mínimo 10 caracteres',
      urlInvalida: 'URL inválida',
      min1Vaga: 'Mínimo 1 vaga',
      dataNoPassado: 'A data não pode ser no passado',
      valorInvalido: 'Valor inválido',
      min1Dia: 'Mínimo 1 dia',
      max100Porcento: 'Máximo 100%',
      informeValor: 'Informe o valor da oferta',
      descrevaProduto: 'Descreva o produto oferecido',
      informePercentual: 'Informe o percentual de comissão',
      oQueRecebe: 'O que você recebe',
      produtoEnviado: 'produto enviado para você',
      diasAteEnvio: 'dias até o envio',
      diasAtePagamento: 'dias até o pagamento',
    },
    detalhe: {
      abas: {
        fila: 'Fila',
        briefing: 'Briefing',
        entregas: 'Entregas',
        pagamento: 'Pagamento',
        resultado: 'Resultado',
      },
      publicar: 'Publicar campanha',
      editar: 'Editar',
      apagarRascunho: 'Apagar rascunho',
      encerrar: 'Encerrar campanha',
      publicarTitulo: 'Publicar campanha?',
      publicarDescricao:
        'O link de candidatura fica ativo na hora e creators já podem se inscrever. Depois de publicada a campanha não volta para rascunho e os detalhes não podem mais ser editados.',
      publicarErro: 'Não foi possível publicar. Tente novamente.',
      publicando: 'Publicando…',
      publicarConfirmar: 'Publicar',
      encerrarTitulo: 'Encerrar campanha?',
      encerrarDescricao:
        'O link de candidatura deixa de aceitar novas inscrições na hora. Candidaturas e conteúdos já em andamento continuam visíveis, mas não será possível reabrir a campanha depois.',
      encerrando: 'Encerrando…',
      encerrarConfirmar: 'Encerrar',
      apagarTitulo: 'Apagar rascunho?',
      apagarDescricao:
        'O rascunho e todos os dados preenchidos somem pra sempre - não dá pra desfazer. Só é possível apagar campanhas que ainda não foram publicadas.',
      apagarErro: 'Não foi possível apagar. Tente novamente.',
      apagando: 'Apagando…',
      apagarConfirmar: 'Apagar',
    },
    visaoGeral: {
      sobre: 'Sobre a campanha',
      semDescricao: 'Sem descrição.',
      verBriefing: 'Ver briefing',
      aOferta: 'A oferta',
      detalhes: 'Detalhes',
      vagas: 'Vagas',
      tipo: 'Tipo',
      tipos: { CASH: 'Pagamento', PRODUCT: 'Produto', COMMISSION: 'Comissão' },
      prazoPagamento: 'Prazo de pagamento',
      prazoCandidatura: 'Prazo de candidatura',
      criadoEm: 'Criado em',
      totalInvestido: 'Total investido (estimado)',
    },
    fila: {
      candidaturas: 'Candidaturas',
      nenhuma: 'Nenhuma candidatura ainda.',
      selecione: 'Selecione uma candidatura na pipeline',
      detalhe: 'Detalhe da candidatura',
      igIndisponivel: 'Dados do Instagram indisponíveis',
      atualizar: 'Atualizar',
      atualizando: 'Atualizando…',
      atualizarIg: 'Atualizar dados do Instagram',
      tenteEm: (min: number) => `Tente em ${min} min`,
      seguidores: 'Seguidores',
      engajamento: 'Engajamento',
      mensagem: 'Mensagem da candidatura',
      postsRecentes: 'Posts recentes',
      whatsapp: 'Chamar no WhatsApp',
      aprovar: 'Aprovar',
      aprovando: 'Aprovando…',
      recusar: 'Recusar',
      recusando: 'Recusando…',
      // Story mobile
      revisar: 'Revisar',
      todas: 'Todas',
      ofertaDaCampanha: 'Oferta da campanha',
      verPosts: 'Ver posts',
      nota: 'Nota da candidatura',
      nichos: 'Nichos',
      feedRecente: 'Feed recente',
      anterior: 'Candidato anterior',
      proximo: 'Próximo candidato',
      fecharRevisao: 'Fechar revisão',
      fecharDetalhes: 'Fechar detalhes',
      voltarALista: 'Voltar à lista',
      revisaoConcluida: 'Revisão concluída',
      filaEmDia: 'Fila em dia.',
      aprovadas: 'Aprovadas',
      recusadas: 'Recusadas',
      pendentes: 'Pendentes',
      voltarACampanha: 'Voltar para a campanha',
    },
    entregas: {
      titulo: 'Entregas',
      abas: {
        ALL: 'Todos',
        PENDING: 'Em análise',
        APPROVED: 'Aprovados',
        REJECTED: 'Recusados',
        REVISION_REQUESTED: 'Revisão',
      },
      vazio: 'Nenhum conteúdo enviado ainda',
      vazioDescricao: 'Os conteúdos aparecem aqui assim que forem enviados.',
      vazioComFiltro: 'Nenhum conteúdo com esse status',
      verConteudo: 'Ver conteúdo',
      legendaEnviada: 'Legenda enviada',
      feedbackEnviado: 'Feedback enviado',
      tipo: 'Tipo',
      aprovar: 'Aprovar',
      aprovando: 'Aprovando…',
      recusar: 'Recusar',
      recusando: 'Recusando…',
      revisar: 'Revisar',
      solicitarRevisao: 'Solicitar revisão',
      solicitarRevisaoDescricao: 'Descreva o que precisa ser ajustado no conteúdo.',
      revisaoPlaceholder: 'Ex: Precisa mencionar o código de desconto...',
      enviando: 'Enviando…',
    },
    pagamento: {
      titulo: 'Recompensas',
      registrar: 'Registrar recompensa',
      creator: 'Creator',
      tipo: 'Tipo',
      valor: 'Valor',
      observacoes: 'Observações (opcional)',
      observacoesPlaceholder: 'Ex: Pix enviado em 15/06/2026',
      tipos: { MONETARY: 'Monetária', PRODUCT: 'Produto', DISCOUNT: 'Desconto' },
      placeholders: {
        MONETARY: 'Ex: R$300,00',
        PRODUCT: 'Ex: Kit Whey 900g',
        DISCOUNT: 'Ex: Cupom AMANDA20 (20% off)',
      },
      abas: { ALL: 'Todas', PENDING: 'Pendente', ISSUED: 'Emitida', DELIVERED: 'Entregue' },
      registrarConfirmar: 'Registrar',
      processando: 'Processando…',
      marcarEmitida: 'Marcar como emitida',
      confirmarEntrega: 'Confirmar entrega',
      remover: 'Remover',
      removendo: 'Removendo…',
      removerTitulo: 'Remover esta recompensa?',
      removerAntes: 'O registro de',
      removerDepois:
        'some pra sempre, e some também da lista de recompensas dela. Não dá pra desfazer, mas você pode registrar de novo.',
      removerErro: 'Não foi possível remover. Tente novamente.',
      vazio: 'Nenhuma recompensa registrada',
      vazioDescricao: 'Registre as recompensas das candidaturas aprovadas nessa campanha.',
      vazioComFiltro: 'Nenhuma recompensa com esse status',
      semAprovadas: 'Recompensas ficam disponíveis quando houver candidatura aprovada.',
      erroRegistrar: 'Erro ao registrar recompensa.',
    },
    resultado: {
      titulo: 'Parcerias',
      filtrar: 'Filtrar parcerias',
      abas: { ALL: 'Todas', PENDING: 'A informar', REGISTERED: 'Informadas' },
      // A ressalva de honestidade (vision.md nº 5): o número é DECLARADO.
      ressalva:
        'Os números são informados por você. O tayro não mede alcance. Eles aparecem pra creator sempre, e no perfil público dela só se você liberar.',
      convite:
        'Você ainda não informou o que esta parceria deu. É o que transforma a candidatura aprovada em histórico, e é a única forma de a creator saber o resultado do trabalho dela.',
      informar: 'Informar resultado',
      editarResultado: 'Editar resultado',
      editar: 'Editar',
      informeSoOqueTem: '. Informe só o que você tem. Nada aqui é obrigatório individualmente.',
      alcance: 'Alcance',
      alcancePlaceholder: 'Ex: 12400',
      impressoes: 'Impressões',
      impressoesPlaceholder: 'Ex: 18900',
      cuponsUsados: 'Cupons usados',
      cuponsPlaceholder: 'Ex: 37',
      observacao: 'Observação (opcional)',
      observacaoLegenda: 'Ela vê esta observação. Escreva pra ela.',
      observacaoPlaceholder: 'Ex: Melhor entrega da campanha. Vamos repetir no próximo drop.',
      podeAparecer: 'Pode aparecer no perfil público dela',
      ligadoDescricao:
        'Os números e sua observação vão aparecer no perfil público dela, com o nome da sua marca ao lado.',
      desligadoDescricao:
        'Desligado, o resultado fica só entre vocês duas: ela vê, o público não.',
      erroSalvar: 'Não foi possível salvar o resultado.',
      apagarTitulo: 'Apagar este resultado?',
      apagarSufixo: ' e do perfil público dela',
      apagarRessalva:
        'Ela já foi avisada de que você registrou. Corrigir os números editando é menos confuso pra ela do que apagar.',
      informadoPor: (data: string) => `Informado por você em ${data}`,
      apagarCorpo: (sufixo: string) =>
        `sai do registro dela${sufixo}, e a parceria volta a contar como não informada.`,
      apagarErro: 'Não foi possível apagar. Tente novamente.',
      informado: 'Informado',
      noPerfilPublico: 'No perfil público dela',
      liberadoMasOculto: 'Liberado por você, mas ela escolheu não mostrar',
      aparece: 'Aparece, com o nome da sua marca',
      naoAparece: 'Não aparece. Só ela vê',
      vazio: 'Nenhuma parceria aprovada ainda',
      vazioDescricao: 'Resultado existe depois de aprovar uma candidatura na Fila.',
      todasInformadas: 'Todas as parcerias já têm resultado informado',
      nenhumInformado: 'Nenhum resultado informado ainda',
    },
    creators: {
      titulo: 'Creators',
      subtitulo: 'Creators com candidatura aprovada',
      erro: 'Erro ao carregar os dados. Tente novamente.',
      vazio: 'Nenhuma candidatura aprovada ainda',
      vazioDescricao:
        'Aprove uma candidatura na Fila de alguma campanha para ver o media kit aqui.',
      mediaKit: 'Media kit',
      seguidores: 'Seguidores',
      engajamento: 'Engajamento',
      postsRecentes: 'Posts recentes',
      telefoneNaoInformado: 'Telefone não informado',
      whatsapp: 'Falar no WhatsApp',
      // Concorda com CANDIDATURA, nunca com a pessoa: assumir o gênero de quem
      // usa o produto e regra do projeto.
      aprovacoes: (n: number) =>
        n === 1 ? '1 candidatura aprovada' : `${n} candidaturas aprovadas`,
    },
    perfil: {
      titulo: 'Marca',
      legenda: 'É a primeira coisa que aparece no seu link.',
      erro: 'Erro ao carregar o perfil. Tente novamente.',
      campanhaDe: 'Campanha de',
      nome: 'Nome da marca',
      logo: 'Logo (URL)',
      logoPlaceholder: 'https://cdn.suamarca.com/logo.png',
      bio: 'Bio',
      bioPlaceholder: 'Conte sobre sua marca para quem for se candidatar.',
      nichos: 'Nichos',
      website: 'Website',
      websitePlaceholder: 'https://suamarca.com',
      salvo: 'Salvo',
    },
  },

  // ── Seção "Conta" (perfil da marca e da creator) ─────────────────────────
  conta: {
    titulo: 'Conta',
    email: 'E-mail',
    senha: 'Senha',
    senhaValor: '••••••••',
    exportar: 'Exportar meus dados',
    exportando: 'Exportando…',
    exportado: 'Baixado',
    erroExportar: 'Erro ao exportar. Tente de novo.',
    apagarConta: 'Apagar minha conta',
  },
};

export type AppDictionary = typeof ptApp;
