import { Link } from 'react-router-dom';
import {
  LegalDocumentShell,
  Section,
  SubSection,
  List,
  Callout,
  Placeholder,
  ContactLink,
} from '../../components/legal/LegalDocument';
import {
  TERMS_LABEL,
  TERMS_PATH,
  PRIVACY_VERSION,
  LEGAL_UPDATED_AT,
  LEGAL_CONTACT_EMAIL,
} from '../../config/legal';

// ─── Política de Privacidade ─────────────────────────────────────────────────
//
// Documento aceito junto com os Termos nas caixas dos três fluxos de criação de
// conta. A versão exibida aqui PRECISA corresponder a `PRIVACY_VERSION` em
// `apps/api/src/shared/legal/legal-documents.ts`, que é o valor gravado em
// `User.acceptedPrivacyVersion`.
//
// Escrita a partir do código, não do que seria confortável afirmar. Os pontos
// em que isso mais aparece, e que não devem ser "simplificados" numa revisão
// futura sem checar o código de novo:
//
//  - A exclusão de conta de creator é ANONIMIZAÇÃO com preservação do registro
//    de negócio, incluindo campos de texto livre (ver seção 13 e
//    specs/account-deletion → Known Gaps). Não existe hard delete.
//  - Não existe mecanismo de expiração ou purga automática de dado nenhum
//    (seção 12). Nenhum prazo pode ser prometido aqui.
//  - As fontes são hospedadas por nós desde 2026-09-04 (assets/fonts/fonts.css).
//    Antes disso vinham do Google e o navegador de todo visitante entregava IP,
//    user-agent e referer a ele. Se alguém voltar a carregar fonte, ícone ou
//    script de um domínio externo no index.html, este documento passa a estar
//    errado e o terceiro precisa voltar para a seção 8.
//  - Imagens do Instagram são buscadas pelo NOSSO servidor e reexibidas pelo
//    nosso domínio; o navegador da pessoa não fala com a CDN do Instagram.
//
// Identidade do controlador (2026-09-09): o TAYRO ainda não tem razão social
// nem CNPJ constituídos, então o controlador registrado é a pessoa física
// (Pedro, CPF preenchido na seção 1). Falta só o endereço, que ele decidiu não
// informar por ora. NÃO remover o bloco de campo a preencher até que o
// endereço exista de verdade (ou até constituir CNPJ, o que troca o nome/CPF
// também).
export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentShell
      updatedLabel={`Versão ${PRIVACY_VERSION} · atualizada em ${LEGAL_UPDATED_AT}`}
      title="Política de Privacidade"
      intro={
        <>
          <p>
            Esta Política de Privacidade explica como o{' '}
            <strong className="text-foreground">TAYRO</strong> coleta, utiliza, armazena e
            compartilha dados pessoais, e quais direitos você possui sobre esses dados, nos termos
            da Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018).
          </p>
          <p>
            Ela se aplica a todas as pessoas que utilizam ou visitam a plataforma, incluindo{' '}
            <strong className="text-foreground">creators, marcas e visitantes</strong> das páginas
            públicas.
          </p>
          <p>
            Esta Política descreve o funcionamento{' '}
            <strong className="text-foreground">atual</strong> da plataforma. Quando uma
            funcionalidade não existe, isso está dito de forma expressa, e não omitido.
          </p>
        </>
      }
      footer={
        <Link
          to={TERMS_PATH}
          className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted transition-colors hover:text-lime"
        >
          {TERMS_LABEL}
        </Link>
      }
    >
      <Section id="controlador" title="1. Quem somos e quem é o controlador">
        <p>
          O TAYRO é uma plataforma que aproxima marcas e creators para viabilizar parcerias de
          divulgação. O controlador dos dados pessoais tratados diretamente pela plataforma é:
        </p>
        <Placeholder>
          <p className="font-medium text-foreground">Pedro Soares de Souza Garcia</p>
          <p>CPF: 119.407.186-43</p>
          <p>[ENDEREÇO, a preencher antes da publicação em produção]</p>
          <p>E-mail: {LEGAL_CONTACT_EMAIL}</p>
        </Placeholder>
        <p>
          Ainda não há um encarregado pelo tratamento de dados pessoais formalmente designado. As
          solicitações relacionadas a dados pessoais devem ser enviadas ao e-mail acima, que é o
          canal indicado nesta Política para esse fim.
        </p>
        <p>
          Além do TAYRO, uma <strong className="text-foreground">marca</strong> que recebe dados de
          creators por meio da plataforma passa a tratá-los para suas próprias finalidades, como
          análise de candidaturas, contato, gestão da campanha e acompanhamento da parceria. Nessa
          medida, a marca atua como controladora dos dados que recebe e responde pelo tratamento que
          realiza. A seção 9 detalha o que é compartilhado entre as partes.
        </p>
      </Section>

      <Section id="dados-coletados" title="2. Quais dados coletamos">
        <p>Os dados pessoais tratados pelo TAYRO têm quatro origens:</p>
        <List
          items={[
            'dados que você mesmo fornece ao criar conta, preencher seu perfil e utilizar as funcionalidades (seções 3 e 4)',
            'dados obtidos de fontes externas, a partir do nome de usuário de Instagram que o creator informa (seção 5)',
            'dados gerados pela própria utilização da plataforma, como registros de candidatura, decisões, recompensas e resultados (seções 3 e 4)',
            'dados técnicos relacionados ao funcionamento e à segurança da aplicação (seção 6)',
          ]}
        />
        <p>
          <strong className="text-foreground">
            Não existem, em nenhuma funcionalidade, campos destinados a coletar
          </strong>{' '}
          data de nascimento, documentos de identificação, CPF ou CNPJ de usuários, dados bancários,
          dados de cartão de crédito, dados de pagamento, dados de geolocalização precisa ou dados
          biométricos.
        </p>
        <p>
          O TAYRO também{' '}
          <strong className="text-foreground">
            não solicita deliberadamente dados pessoais sensíveis
          </strong>{' '}
          na acepção da LGPD como parte de seus cadastros ou funcionalidades. Entretanto, usuários
          podem eventualmente inserir informações dessa natureza em campos de texto livre, como a
          biografia do perfil, a mensagem de uma candidatura, a legenda de um conteúdo ou as
          observações de uma recompensa. Nesses casos, o tratamento observará a legislação
          aplicável.
        </p>
        <p>
          A plataforma também{' '}
          <strong className="text-foreground">não possui upload de arquivos</strong>: nenhum vídeo,
          foto ou documento é enviado para os nossos servidores pelos usuários.
        </p>
      </Section>

      <Section id="dados-creator" title="3. Dados de creators">
        <SubSection title="3.1. Dados de cadastro e de perfil">
          <List
            items={[
              'nome',
              'e-mail',
              'telefone',
              'senha (armazenada apenas como hash, nunca em texto legível)',
              'nome de usuário (@) do Instagram',
              'cidade',
              'nichos de atuação',
              'biografia',
              'endereço de imagem de perfil, quando informado manualmente',
              'nome de usuário do TikTok, quando informado',
            ]}
          />
          <p>
            O nome de usuário do TikTok é um campo opcional do perfil. Atualmente ele{' '}
            <strong className="text-foreground">
              não é exibido às marcas nem no perfil público
            </strong>
            , e é utilizado apenas na sua própria conta e na exportação dos seus dados.
          </p>
          <p>
            O nome de usuário do Instagram é definido no primeiro cadastro e, neste fluxo, não é
            editável pelo próprio creator depois disso.
          </p>
        </SubSection>

        <SubSection title="3.2. Dados gerados pelo uso da plataforma">
          <List
            items={[
              'candidaturas enviadas, com data, campanha, situação (pendente, aprovada, recusada ou retirada) e data da decisão',
              'a mensagem escrita pelo creator ao se candidatar, quando preenchida',
              'endereços (links) dos conteúdos registrados, tipo de mídia, legenda opcional, situação da revisão e o comentário escrito pela marca',
              'recompensas registradas pela marca em seu nome, com tipo, valor, situação, observações e data',
              'resultados de parceria informados pela marca, com alcance, impressões, cupons utilizados e observação, quando preenchidos',
              'a opção de manter ou não o perfil público ativo, e a opção de ocultar resultados específicos',
            ]}
          />
        </SubSection>

        <SubSection title="3.3. Registro de aceite dos documentos">
          <p>
            Ao criar conta, a plataforma registra, associados à sua conta, os seguintes dados sobre
            o aceite:
          </p>
          <List
            items={[
              'a versão dos Termos de Uso aceita',
              'a versão desta Política de Privacidade aceita',
              'a data e a hora do aceite',
              'a data e a hora da declaração de que possui 18 anos ou mais',
            ]}
          />
          <p>
            A versão registrada é definida pelo servidor no momento do aceite, e não é informada
            pelo navegador. Contas criadas antes de 4 de setembro de 2026, quando esse registro
            passou a existir, não possuem esses dados preenchidos.
          </p>
        </SubSection>
      </Section>

      <Section id="dados-marca" title="4. Dados de marcas">
        <SubSection title="4.1. Dados de cadastro e de perfil">
          <List
            items={[
              'e-mail',
              'senha (armazenada apenas como hash, nunca em texto legível)',
              'nome da marca',
              'nichos de atuação',
              'website',
              'endereço da imagem de logotipo, quando informado',
              'biografia ou descrição da marca',
            ]}
          />
          <p>
            O cadastro de marca não solicita CNPJ, razão social, endereço ou dados de representante
            legal, e o TAYRO não verifica a existência ou a identidade da marca cadastrada.
          </p>
        </SubSection>

        <SubSection title="4.2. Dados gerados pelo uso da plataforma">
          <List
            items={[
              'campanhas criadas, com título, descrição, briefing, nichos, prazos, número de vagas e situação',
              'termos da oferta apresentada aos creators, incluindo valor, tipo, prazo, descrição e percentual de comissão',
              'decisões tomadas sobre cada candidatura recebida, com data',
              'revisões de conteúdo, com a situação atribuída e o comentário escrito',
              'recompensas registradas, com tipo, valor, situação, observações e datas',
              'resultados de parceria informados, e a autorização, ou não, para que apareçam no perfil público do creator',
            ]}
          />
        </SubSection>

        <SubSection title="4.3. Registro de aceite dos documentos">
          <p>
            O cadastro de marca registra os mesmos dados de aceite descritos no item 3.3, nas mesmas
            condições.
          </p>
        </SubSection>
      </Section>

      <Section id="fontes-externas" title="5. Dados obtidos de fontes externas">
        <Callout>
          <p>
            O TAYRO <strong className="text-foreground">não possui integração oficial</strong> com o
            Instagram ou com a Meta, e não é parceiro ou autorizado por elas.
          </p>
          <p>
            As informações de perfil são obtidas por meio de um{' '}
            <strong className="text-foreground">provedor externo não oficial</strong>, acessado
            através da RapidAPI, a partir de informações publicamente disponíveis no perfil cujo
            nome de usuário o creator informou. Elas{' '}
            <strong className="text-foreground">não são dados oficiais do Instagram</strong> e não
            são auditadas por nós.
          </p>
        </Callout>
        <p>Conforme a disponibilidade na fonte consultada, podemos obter e armazenar:</p>
        <List
          items={[
            'o nome de usuário e o identificador do perfil na plataforma de origem',
            'o número de seguidores',
            'o endereço da foto de perfil',
            'publicações recentes, com endereço da publicação, endereço da imagem de pré-visualização, número de curtidas e número de comentários',
          ]}
        />
        <p>A partir dessas informações, a plataforma também gera e armazena:</p>
        <List
          items={[
            <>
              uma <strong className="text-foreground">estimativa de taxa de engajamento</strong>,
              calculada por nós como a média de curtidas e comentários por publicação recente
              consultada, dividida pelo número de seguidores. O Instagram não publica essa métrica:
              o número é uma estimativa do TAYRO, e não uma métrica oficial.
            </>,
            'a data e a hora da última consulta, e se ela teve sucesso, está em andamento ou falhou',
            <>
              <strong className="text-foreground">cópias das próprias imagens</strong> de foto de
              perfil e de pré-visualização das publicações, armazenadas por nós.
            </>,
          ]}
        />
        <p>
          As cópias de imagem existem por uma razão técnica: os endereços fornecidos pela rede de
          distribuição de conteúdo do Instagram são temporários e expiram, de modo que guardar
          apenas o endereço faria as imagens desaparecerem da tela depois de algum tempo. As imagens
          são obtidas <strong className="text-foreground">pelos nossos servidores</strong> e
          reexibidas pelo nosso próprio domínio: o navegador de quem visualiza uma página do TAYRO
          não se conecta à rede de distribuição do Instagram.
        </p>
        <p>
          Ao informar um nome de usuário nos formulários de cadastro e de candidatura, a plataforma
          consulta a fonte externa apenas para indicar se aquele nome aparentemente existe. Essa
          verificação não confirma titularidade e não retorna dados do perfil.
        </p>
        <p>
          A consulta é feita quando o creator informa o nome de usuário, quando envia uma
          candidatura e quando a atualização é solicitada manualmente na plataforma, respeitados
          intervalos mínimos entre consultas.
        </p>
      </Section>

      <Section id="dados-tecnicos" title="6. Dados técnicos e registros de erro">
        <p>
          Para manter a plataforma funcionando, investigar falhas e proteger o serviço, são gerados
          registros técnicos, que podem conter:
        </p>
        <List
          items={[
            'informações sobre erros ocorridos na aplicação, incluindo mensagem do erro, trecho de código onde ocorreu, endereço da página ou da rota acessada e informações sobre o navegador ou o ambiente',
            'identificadores internos de registros da plataforma, como o identificador de um perfil de creator, quando necessários para diagnosticar a falha',
            'registros operacionais de execução da aplicação, como falhas no envio de e-mails e volume de acessos a determinadas listagens',
          ]}
        />
        <p>
          A ferramenta de monitoramento de erros utilizada está configurada para{' '}
          <strong className="text-foreground">
            não coletar automaticamente dados pessoais do usuário
          </strong>
          , incluindo endereço IP, e para remover, antes do envio, o conteúdo enviado nas rotas de
          autenticação e os cabeçalhos de autenticação e de sessão. Assim, senhas e credenciais não
          são enviadas a essa ferramenta.
        </p>
        <p>
          A plataforma <strong className="text-foreground">não utiliza gravação de sessão</strong>{' '}
          (session replay), não grava a tela, os cliques ou a digitação do usuário, e não utiliza
          ferramentas de analytics, de perfilamento comportamental ou de publicidade.
        </p>
        <p>
          Quando o envio de um e-mail falha, o endereço de destino é registrado de forma
          parcialmente mascarada no registro de erro, preservando apenas o necessário para o
          diagnóstico.
        </p>
        <p>
          Os prestadores de serviço de hospedagem podem, por sua própria conta e para operar sua
          infraestrutura, manter registros de acesso, incluindo endereço IP, conforme suas
          respectivas políticas.
        </p>
      </Section>

      <Section id="finalidades" title="7. Para que usamos os dados e com que base legal">
        <p>Utilizamos os dados pessoais para:</p>
        <List
          items={[
            'criar, manter e administrar contas, e autenticar usuários',
            'permitir que marcas criem, publiquem e administrem campanhas',
            'permitir que creators encontrem campanhas e enviem candidaturas',
            'apresentar às marcas as informações necessárias para analisar candidaturas e decidir sobre elas',
            'registrar conteúdos, recompensas e resultados de parcerias, e apresentá-los à contraparte',
            'criar e manter o perfil e o media kit do creator, e disponibilizá-los publicamente quando ele optar por isso',
            'enviar comunicações necessárias ao funcionamento da conta, como definição e recuperação de senha, decisão sobre candidatura, registro de resultado, alteração de e-mail e confirmação de exclusão de conta',
            'identificar, investigar e corrigir falhas técnicas',
            'proteger a plataforma e seus usuários contra fraude, abuso e acesso não autorizado',
            'registrar o aceite dos documentos legais e a declaração de maioridade',
            'cumprir obrigações legais e exercer regularmente direitos',
          ]}
        />
        <p>
          Cada tratamento é realizado com a{' '}
          <strong className="text-foreground">
            base legal aplicável à sua respectiva finalidade
          </strong>
          . As bases utilizadas pelo TAYRO, conforme o caso, são as seguintes:
        </p>
        <List
          items={[
            <>
              <strong className="text-foreground">
                Execução de contrato e de procedimentos preliminares
              </strong>{' '}
              (art. 7º, V): criação e manutenção de conta, autenticação, funcionamento das
              campanhas, candidaturas, registros de conteúdo, recompensas e resultados, e envio das
              comunicações necessárias a essas funcionalidades.
            </>,
            <>
              <strong className="text-foreground">Legítimo interesse</strong> (art. 7º, IX):
              segurança da plataforma, prevenção a fraude e abuso, diagnóstico e correção de falhas
              técnicas, e manutenção do registro de aceite dos documentos. Essa base é avaliada para
              cada finalidade concreta, considerando a necessidade do tratamento e as expectativas
              legítimas do titular, e{' '}
              <strong className="text-foreground">
                não autoriza genericamente qualquer tratamento
              </strong>
              .
            </>,
            <>
              <strong className="text-foreground">Consentimento</strong> (art. 7º, I): quando o
              tratamento depende de consentimento, ele é solicitado de forma específica e separada
              do aceite dos documentos. É o caso da ativação do perfil público pelo creator, que é
              opcional, nasce desativada e{' '}
              <strong className="text-foreground">pode ser revogada a qualquer momento</strong>, e
              da publicação de resultados de parceria nesse perfil, que depende também da
              autorização da marca. A revogação não afeta a licitude do tratamento realizado
              enquanto o consentimento esteve vigente.
            </>,
            <>
              <strong className="text-foreground">
                Cumprimento de obrigação legal ou regulatória
              </strong>{' '}
              (art. 7º, II) e{' '}
              <strong className="text-foreground">exercício regular de direitos</strong> (art. 7º,
              VI): conservação de registros nas hipóteses da seção 12 e atendimento a determinações
              de autoridade competente.
            </>,
          ]}
        />
        <Callout>
          <p>
            O aceite desta Política, no momento do cadastro, representa a{' '}
            <strong className="text-foreground">ciência e a aceitação deste documento</strong>.
          </p>
          <p>
            Ele não é um consentimento genérico para todo e qualquer tratamento: cada tratamento se
            apoia na base legal que lhe corresponde, conforme a lista acima. Onde o consentimento é
            a base, ele é solicitado de forma separada e específica, como no caso do perfil público.
          </p>
        </Callout>
        <p>
          A relação acima descreve, de forma geral, as bases legais aplicáveis às finalidades
          descritas nesta Política. Ela não pretende esgotar a análise de cada operação
          individualmente: passando a existir uma finalidade nova, a base legal correspondente será
          identificada e esta Política será atualizada.
        </p>
        <p>
          O TAYRO <strong className="text-foreground">não vende dados pessoais</strong>, não aluga
          bases de contatos, não utiliza dados para publicidade comportamental e não realiza
          decisões automatizadas que produzam efeitos jurídicos sobre os titulares. A decisão sobre
          uma candidatura é tomada por uma pessoa, na marca.
        </p>
      </Section>

      <Section id="compartilhamento" title="8. Com quem compartilhamos dados">
        <p>
          Utilizamos prestadores de serviço para operar a plataforma. Cada um recebe apenas os dados
          necessários à sua função:
        </p>
        <List
          items={[
            <>
              <strong className="text-foreground">Neon</strong> (banco de dados). Armazena
              praticamente todos os dados descritos nas seções 3, 4 e 5, incluindo dados cadastrais,
              perfis, campanhas, candidaturas, conteúdos, recompensas, resultados e as cópias de
              imagem do Instagram.
            </>,
            <>
              <strong className="text-foreground">Railway</strong> (hospedagem da API). Executa a
              aplicação de servidor, e portanto processa todos os dados em trânsito nas
              funcionalidades, além de manter registros operacionais de execução.
            </>,
            <>
              <strong className="text-foreground">Vercel</strong> (hospedagem da aplicação web).
              Distribui as páginas ao navegador e encaminha as requisições à API. Recebe dados de
              conexão, como endereço IP e informações do navegador.
            </>,
            <>
              <strong className="text-foreground">Resend</strong> (envio de e-mails). Recebe o
              endereço de e-mail do destinatário e o conteúdo das mensagens transacionais, que podem
              conter o nome do creator, o nome da marca, o título da campanha e links de definição
              ou recuperação de senha.
            </>,
            <>
              <strong className="text-foreground">Sentry</strong> (monitoramento de erros). Recebe
              os dados técnicos descritos na seção 6, sem coleta automática de endereço IP e com
              remoção de conteúdo e cabeçalhos de autenticação. A instância utilizada está
              configurada na região da União Europeia.
            </>,
            <>
              <strong className="text-foreground">
                RapidAPI e o provedor de consulta ao Instagram
              </strong>
              . Recebem o nome de usuário do Instagram informado pelo creator, para consultar
              informações públicas do perfil e para verificar se aquele nome de usuário existe.
            </>,
            <>
              <strong className="text-foreground">
                Rede de distribuição de conteúdo do Instagram
              </strong>
              . Nossos servidores requisitam a ela as imagens de perfil e de pré-visualização das
              publicações, utilizando os endereços obtidos na consulta. Essa requisição é feita pelo
              nosso servidor, e não pelo navegador de quem visualiza a página.
            </>,
            <>
              <strong className="text-foreground">GitHub e GitHub Actions</strong> (repositório e
              automação de publicação). Utilizados para verificar, construir e publicar novas
              versões da aplicação, incluindo a aplicação de alterações na estrutura do banco de
              dados. Nesse processo são utilizadas credenciais de acesso à infraestrutura de
              produção. O serviço não recebe cópias dos dados pessoais dos usuários para finalidade
              própria.
            </>,
          ]}
        />
        <p>
          A plataforma <strong className="text-foreground">não utiliza</strong>, atualmente,
          provedor de pagamento, serviço de armazenamento de arquivos, ferramenta de analytics, rede
          de publicidade, plataforma de automação de marketing ou ferramenta de atendimento com
          acesso aos dados.
        </p>
        <p>
          Dados pessoais também podem ser compartilhados com autoridades públicas quando houver
          obrigação legal, ordem judicial ou determinação de autoridade competente, e com assessores
          para o exercício regular de direitos.
        </p>
      </Section>

      <Section id="entre-usuarios" title="9. Compartilhamento entre creators e marcas">
        <p>
          A finalidade da plataforma é aproximar as duas partes, e por isso determinadas informações
          são apresentadas de um lado ao outro. O compartilhamento é limitado ao necessário para a
          funcionalidade utilizada.
        </p>

        <SubSection title="9.1. O que a marca vê sobre o creator">
          <p>
            Quando um creator se candidata a uma campanha, a marca responsável passa a ver, sobre
            ele:
          </p>
          <List
            items={[
              'nome',
              'telefone',
              'nome de usuário do Instagram, com link para o perfil na rede social',
              'cidade e nichos',
              'foto de perfil e imagens de pré-visualização das publicações recentes',
              'número de seguidores e a estimativa de engajamento calculada pelo TAYRO',
              'a mensagem escrita na candidatura, quando preenchida',
              'os conteúdos registrados por ele naquela parceria, com link, tipo, legenda e situação',
              'a situação da candidatura e as datas relacionadas',
            ]}
          />
          <p>
            A marca também pode consultar, em uma única tela, todos os creators cujas candidaturas
            ela aprovou em qualquer de suas campanhas, com as mesmas informações acima. O telefone é
            apresentado de forma a permitir contato direto, inclusive por aplicativo de mensagens.
          </p>
        </SubSection>

        <SubSection title="9.2. O que o creator vê sobre a marca">
          <List
            items={[
              'nome da marca, logotipo e website',
              'informações das campanhas, incluindo título, descrição, briefing, nichos, prazos e número de vagas',
              'os termos da oferta apresentada',
              'a decisão sobre a sua candidatura',
              'o comentário escrito pela marca ao revisar um conteúdo',
              'as recompensas registradas em seu nome, com tipo, valor, situação e observações',
              'os resultados de parceria informados pela marca, com a indicação de quem os informou',
            ]}
          />
        </SubSection>

        <SubSection title="9.3. O e-mail das partes">
          <Callout>
            <p>
              O <strong className="text-foreground">endereço de e-mail</strong> de creators e de
              marcas{' '}
              <strong className="text-foreground">não é disponibilizado à contraparte</strong> pelas
              funcionalidades atuais da plataforma. Ele é utilizado pelo TAYRO para autenticação e
              para envio das comunicações da conta.
            </p>
          </Callout>
          <p>
            O e-mail pode, naturalmente, chegar à contraparte se o próprio usuário o informar em um
            campo de texto livre, como a mensagem da candidatura, ou fora da plataforma.
          </p>
        </SubSection>
      </Section>

      <Section id="perfil-publico" title="10. Perfil público do creator">
        <p>
          O perfil público <strong className="text-foreground">nasce desativado</strong>. Ele só
          passa a existir quando o próprio creator o ativa, e essa ativação é o consentimento para a
          publicação das informações abaixo.
        </p>
        <p>
          Ativado, o perfil fica acessível por um endereço público, sem login, no formato{' '}
          <code className="rounded bg-kinetic-dark px-1 py-0.5 text-xs">tayro.app.br/c/seu-@</code>,
          e passa a exibir, conforme estejam preenchidos:
        </p>
        <List
          items={[
            'nome e nome de usuário do Instagram',
            'foto de perfil e imagens de pré-visualização das publicações recentes',
            'biografia, cidade e nichos',
            'telefone',
            'número de seguidores e a estimativa de engajamento calculada pelo TAYRO',
            'a quantidade de parcerias concluídas, calculada pela regra informada na própria página',
            'resultados de parcerias, apenas nas condições descritas abaixo',
          ]}
        />
        <p>
          O <strong className="text-foreground">telefone é publicado junto</strong> com as demais
          informações quando o perfil público está ativo. Não há opção separada para publicar o
          perfil sem o telefone.
        </p>
        <p>
          O <strong className="text-foreground">e-mail nunca é exibido</strong> no perfil público, e
          o nome de usuário do TikTok também não.
        </p>
        <p>
          Um resultado de parceria só aparece publicamente quando a marca que o informou autorizou a
          exibição pública, autorização que nasce desativada, e o creator não ocultou aquele
          resultado. O creator pode ocultar cada resultado individualmente, sem desativar o perfil
          inteiro, e sempre consegue ver, na sua conta, os resultados informados pelas marcas,
          estejam eles públicos ou não.
        </p>
        <p>
          Enquanto o perfil público estiver desativado, o endereço público não o exibe e as imagens
          de perfil e de publicações associadas àquele creator{' '}
          <strong className="text-foreground">não são acessíveis publicamente</strong>. Nesse caso,
          o acesso a essas imagens fica restrito ao próprio creator e às marcas que tenham recebido
          candidatura dele.
        </p>
        <p>
          Sendo uma página aberta, o perfil público pode ser indexado por mecanismos de busca e
          copiado por terceiros. Desativá-lo interrompe a publicação a partir daquele momento, mas
          não alcança cópias, capturas de tela ou indexações que já tenham sido feitas por
          terceiros, sobre as quais o TAYRO não tem controle.
        </p>
      </Section>

      <Section id="cookies" title="11. Cookies e armazenamento no navegador">
        <p>
          O TAYRO <strong className="text-foreground">não utiliza cookies de publicidade</strong>,
          cookies de terceiros para rastreamento entre sites, pixels de rastreamento ou ferramentas
          de analytics. Por isso a plataforma não exibe banner de consentimento de cookies.
        </p>
        <p>São utilizados apenas os seguintes recursos, todos necessários ao funcionamento:</p>
        <List
          items={[
            <>
              <strong className="text-foreground">Cookie de sessão</strong>. Um único cookie
              próprio, usado para manter você autenticado e renovar a sessão. Ele é configurado para
              não ser acessível por scripts da página (HttpOnly), é transmitido apenas por conexão
              segura em produção e tem validade limitada. Ele também é o que permite verificar, ao
              carregar uma imagem de perfil, se você tem autorização para vê-la.
            </>,
            <>
              <strong className="text-foreground">Memória do navegador durante a sessão</strong>. O
              dado usado para autorizar suas ações permanece apenas na memória da aba aberta, e não
              é gravado em armazenamento persistente do dispositivo.
            </>,
            <>
              <strong className="text-foreground">Armazenamento local do navegador</strong>, quando
              utilizado, para preferências de interface do próprio dispositivo. Esse dado permanece
              no seu navegador e não é enviado ao TAYRO.
            </>,
            <>
              <strong className="text-foreground">Cache da aplicação</strong>. A plataforma pode ser
              instalada como aplicativo e mantém em cache os arquivos da interface para funcionar
              melhor. As respostas das rotas de dados são explicitamente excluídas desse cache, de
              modo que informações de uma conta não fiquem guardadas no dispositivo para o próximo
              usuário.
            </>,
          ]}
        />
        <p>
          As fontes tipográficas utilizadas pela plataforma são{' '}
          <strong className="text-foreground">servidas pelo próprio domínio do TAYRO</strong>, e não
          por servidores de terceiros. Carregar uma página não estabelece conexão com nenhum
          fornecedor externo de fontes.
        </p>
      </Section>

      <Section id="retencao" title="12. Por quanto tempo guardamos os dados">
        <p>
          Mantemos os dados pessoais enquanto a conta existir e enquanto forem necessários às
          finalidades desta Política, ou enquanto houver outra base legal que justifique sua
          conservação.
        </p>
        <Callout>
          <p>
            Para ser exato: a plataforma{' '}
            <strong className="text-foreground">
              não possui, atualmente, mecanismo de expiração ou de eliminação automática de dados
            </strong>{' '}
            após um prazo determinado.
          </p>
          <p>
            Por isso esta Política não estabelece prazos fixos de retenção que não poderiam ser
            cumpridos. Os dados são eliminados ou anonimizados quando você solicita a exclusão da
            conta, na forma da seção 13, ou quando deixarem de ser necessários e essa eliminação for
            realizada por nós.
          </p>
        </Callout>
        <p>
          Após o pedido de exclusão, determinados dados podem ser conservados quando necessários
          para:
        </p>
        <List
          items={[
            'cumprimento de obrigação legal ou regulatória',
            'exercício regular de direitos, inclusive em processo judicial, administrativo ou arbitral',
            'prevenção a fraude e segurança do titular e de terceiros',
            'preservação do histórico da relação comercial entre marca e creator, incluindo a comprovação do trabalho realizado e das contrapartidas registradas',
            'outras hipóteses autorizadas pela LGPD',
          ]}
        />
        <p>
          Os prestadores de serviço listados na seção 8 podem manter cópias técnicas e registros
          próprios por prazos definidos em suas respectivas políticas, incluindo cópias de segurança
          da infraestrutura.
        </p>
      </Section>

      <Section id="exclusao" title="13. Exclusão e anonimização da conta">
        <p>
          Esta seção descreve exatamente o que acontece hoje quando um creator solicita a exclusão
          da conta pela funcionalidade disponível no Perfil, que exige a confirmação da senha.
        </p>
        <Callout>
          <p>
            A exclusão{' '}
            <strong className="text-foreground">
              não é a eliminação integral de todos os registros
            </strong>
            . Ela remove e anonimiza os dados que identificam você, e preserva os registros da
            relação comercial, sem vínculo com a sua identidade.
          </p>
        </Callout>
        <SubSection title="13.1. O que é removido ou anonimizado">
          <List
            items={[
              'nome, biografia, telefone, cidade, nichos, nome de usuário do Instagram, nome de usuário do TikTok e endereço de imagem de perfil informado manualmente',
              'as cópias de imagem de perfil e de publicações que guardávamos, que são apagadas',
              'o número de seguidores, a estimativa de engajamento e as publicações recentes armazenadas',
              'o endereço de e-mail, substituído por um valor sem correspondência com o endereço original',
              'a senha, cujo registro é substituído por um valor aleatório e descartado, de modo que a senha anterior deixa de existir na plataforma',
              'os registros de sessão e todos os links pendentes de definição ou de recuperação de senha, que são invalidados',
              'a ativação do perfil público, que é desligada, encerrando a exibição pública',
            ]}
          />
          <p>
            Candidaturas que ainda estivessem pendentes de decisão passam à situação de retiradas. A
            conta deixa de permitir acesso.
          </p>
        </SubSection>
        <SubSection title="13.2. O que permanece armazenado">
          <p>
            Os registros abaixo são preservados, sem os dados de identificação removidos no item
            anterior, porque documentam a relação comercial e o trabalho realizado, e a marca
            envolvida também pode precisar deles para o exercício regular de direitos e para
            cumprimento de obrigações próprias:
          </p>
          <List
            items={[
              'as candidaturas enviadas, com campanha, situação e datas',
              'os conteúdos registrados, com o endereço (link) informado, o tipo, a legenda e a situação da revisão',
              'as recompensas registradas pela marca, com tipo, valor, situação, observações e datas',
              'os resultados de parceria informados pela marca',
              'o registro de aceite dos documentos, ou seja, as versões aceitas e as datas de aceite e da declaração de maioridade, que são preservados como prova de que a relação existiu sob determinada versão dos documentos e não identificam a pessoa',
            ]}
          />
          <p>
            É importante notar que esses registros podem conter{' '}
            <strong className="text-foreground">campos de texto livre</strong>, escritos por você ou
            pela marca, como a mensagem enviada na candidatura, a legenda de um conteúdo, o endereço
            do conteúdo e as observações de uma recompensa ou de um resultado. Havendo informação
            pessoal nesses textos, ela permanece armazenada nesses registros após a exclusão da
            conta.
          </p>
          <p>
            Desejando a eliminação ou a anonimização também desses textos, você pode solicitá-la
            pelo canal de contato desta Política, e a solicitação será analisada considerando as
            hipóteses de conservação da seção 12.
          </p>
        </SubSection>
        <SubSection title="13.3. Contas de marca">
          <p>
            A plataforma <strong className="text-foreground">ainda não possui</strong>{' '}
            funcionalidade de exclusão para contas de marca. A solicitação deve ser feita pelo canal
            de contato desta Política e será processada por nós.
          </p>
        </SubSection>
        <p>
          Confirmada a exclusão, enviamos uma comunicação ao endereço de e-mail original, informando
          o que foi removido e o que permanece.
        </p>
      </Section>

      <Section id="direitos" title="14. Seus direitos">
        <p>
          A LGPD assegura a você, como titular, os direitos de confirmação da existência de
          tratamento, acesso aos dados, correção de dados incompletos, inexatos ou desatualizados,
          anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
          desconformidade, portabilidade, informação sobre compartilhamento, informação sobre a
          possibilidade de não fornecer consentimento, revogação do consentimento e revisão de
          decisões automatizadas.
        </p>

        <SubSection title="14.1. O que você resolve na própria plataforma">
          <List
            items={[
              <>
                <strong className="text-foreground">Exportar meus dados.</strong> Disponível na
                seção Conta do seu Perfil, para creators e para marcas. Gera um arquivo com os dados
                associados à sua conta, incluindo perfil, candidaturas, conteúdos, recompensas,
                resultados e o registro de aceite. O arquivo não inclui senha, credenciais de sessão
                nem as cópias de imagem armazenadas.
              </>,
              <>
                <strong className="text-foreground">Corrigir seus dados.</strong> Editando os campos
                disponíveis no seu Perfil.
              </>,
              <>
                <strong className="text-foreground">Alterar e-mail e senha.</strong> Na seção Conta
                do seu Perfil.
              </>,
              <>
                <strong className="text-foreground">
                  Revogar o consentimento do perfil público.
                </strong>{' '}
                Desativando o perfil público no seu Perfil, ou ocultando resultados individualmente.
              </>,
              <>
                <strong className="text-foreground">Excluir a conta.</strong> Disponível no Perfil,
                para creators, com os efeitos descritos na seção 13.
              </>,
            ]}
          />
          <p>
            A exportação disponível na plataforma cobre os dados associados à sua conta, e não
            necessariamente todo e qualquer dado tratado em qualquer contexto. A portabilidade a
            outro fornecedor, quando aplicável, observará a regulamentação da ANPD e deve ser
            solicitada pelo canal abaixo.
          </p>
        </SubSection>

        <SubSection title="14.2. O que precisa ser solicitado por e-mail">
          <List
            items={[
              'exclusão de conta de marca, enquanto não houver funcionalidade equivalente',
              'eliminação ou anonimização dos campos de texto livre descritos no item 13.2',
              'informação detalhada sobre as entidades com as quais seus dados foram compartilhados',
              'portabilidade dos dados a outro fornecedor, nos termos da regulamentação aplicável',
              'anonimização ou bloqueio de dados específicos',
              'informação e revisão relacionadas a tratamento automatizado, quando aplicável',
              'qualquer outra solicitação que não possa ser atendida pelas funcionalidades acima',
            ]}
          />
          <ContactLink />
          <p>
            As solicitações serão analisadas e respondidas nos prazos e condições da legislação
            aplicável. Podemos precisar de informações adicionais para confirmar sua identidade
            antes de atender a um pedido, como medida de segurança.
          </p>
          <p>
            Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados
            (ANPD).
          </p>
        </SubSection>
      </Section>

      <Section id="seguranca" title="15. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger os dados pessoais contra acesso
          não autorizado, perda, alteração, destruição e outras formas de tratamento inadequado.
          Entre elas:
        </p>
        <List
          items={[
            'senhas armazenadas apenas como hash, por algoritmo próprio para esse fim (bcrypt), e nunca em texto legível',
            'comunicação entre navegador e aplicação por conexão criptografada (HTTPS)',
            'autenticação por token de curta duração, mantido apenas na memória do navegador, com renovação por cookie de sessão inacessível a scripts da página',
            'renovação de credenciais de sessão a cada uso, de forma que a credencial anterior deixa de ser válida',
            'encerramento das demais sessões quando a senha é alterada',
            'controles de autorização aplicados às rotas da aplicação, incluindo a verificação de quem pode visualizar cada imagem de perfil',
            'limitação de requisições, com limites mais restritos nas rotas de autenticação e de credenciais',
            'limites de tamanho e validação de formato nos campos submetidos à aplicação',
            'restrição das mensagens de erro apresentadas ao usuário, para não revelar detalhes internos da aplicação',
            'monitoramento de erros configurado para não coletar dados pessoais por padrão e para remover conteúdo e cabeçalhos de autenticação',
            'controle de acesso à infraestrutura e aos serviços utilizados pela plataforma',
          ]}
        />
        <p>
          Nenhum sistema é completamente seguro, e não podemos garantir segurança absoluta.
          Identificando ou suspeitando de incidente de segurança relacionado à sua conta, entre em
          contato pelo canal desta Política. Ocorrendo incidente de segurança com risco ou dano
          relevante, adotaremos as providências da LGPD, incluindo a comunicação à ANPD e aos
          titulares afetados quando aplicável.
        </p>
      </Section>

      <Section id="transferencia" title="16. Transferência internacional de dados">
        <p>
          Parte dos prestadores de serviço listados na seção 8 são empresas estrangeiras ou utilizam
          infraestrutura localizada fora do Brasil. Assim, o tratamento de dados pessoais pode
          envolver transferência internacional.
        </p>
        <p>
          Entre os serviços utilizados, temos confirmado que a instância de monitoramento de erros
          (Sentry) está configurada na <strong className="text-foreground">União Europeia</strong>.
          Para os demais serviços, a localização exata da infraestrutura pode variar conforme a
          configuração e a região adotada por cada fornecedor, e por isso não indicamos aqui um país
          específico que não possamos confirmar.
        </p>
        <p>
          Havendo transferência internacional, o TAYRO adotará os mecanismos e as salvaguardas
          previstos na LGPD e na regulamentação da ANPD, buscando assegurar nível de proteção
          adequado, com transparência quanto à finalidade, ao destino, ao compartilhamento, às
          responsabilidades e às medidas de segurança aplicáveis.
        </p>
      </Section>

      <Section id="menores" title="17. Menores de idade">
        <p>
          O TAYRO é destinado exclusivamente a pessoas com{' '}
          <strong className="text-foreground">18 anos ou mais</strong> e não busca coletar dados
          pessoais de menores de idade.
        </p>
        <p>
          Ao criar conta, é obrigatório declarar que possui 18 anos ou mais, e essa declaração é
          registrada com data e hora. A plataforma{' '}
          <strong className="text-foreground">
            não solicita data de nascimento e não realiza verificação documental, biométrica ou
            automatizada da idade
          </strong>
          : o que existe é a declaração do próprio usuário.
        </p>
        <p>
          Tomando conhecimento de que uma conta pertence a pessoa menor de 18 anos, poderemos
          encerrá-la e eliminar ou anonimizar os dados pessoais, observadas as hipóteses legais de
          conservação. Sendo esse o caso, o responsável legal pode entrar em contato pelo canal
          desta Política.
        </p>
      </Section>

      <Section id="alteracoes" title="18. Alterações nesta Política">
        <p>
          Esta Política pode ser atualizada em razão de mudanças nas funcionalidades da plataforma,
          nos serviços utilizados ou na legislação aplicável.
        </p>
        <p>
          Cada versão é identificada por um número de versão e por uma data, informados no início
          desta página. A versão vigente é a publicada aqui.
        </p>
        <p>
          Sendo a alteração relevante para os seus direitos ou para a forma de tratamento dos seus
          dados, buscaremos comunicá-la por e-mail, por aviso na plataforma ou por outro meio
          apropriado, e poderemos solicitar novo aceite.
        </p>
      </Section>

      <Section id="contato" title="19. Contato">
        <p>
          Para dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais
          pelo TAYRO, e para exercer os direitos descritos na seção 14, entre em contato:
        </p>
        <ContactLink />
        <p>
          A identificação do controlador consta da seção 1. As regras de uso da plataforma estão nos{' '}
          <Link
            to={TERMS_PATH}
            className="text-lime underline underline-offset-2 hover:text-foreground"
          >
            {TERMS_LABEL}
          </Link>
          .
        </p>
      </Section>
    </LegalDocumentShell>
  );
}
