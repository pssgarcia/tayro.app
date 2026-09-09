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
  PRIVACY_LABEL,
  PRIVACY_PATH,
  TERMS_VERSION,
  LEGAL_UPDATED_AT,
  LEGAL_CONTACT_EMAIL,
} from '../../config/legal';

// ─── Termos de Uso ───────────────────────────────────────────────────────────
//
// Documento aceito pelas caixas dos três fluxos de criação de conta (cadastro
// de creator, cadastro de marca e candidatura pública). A versão exibida aqui
// PRECISA corresponder a `TERMS_VERSION` em
// `apps/api/src/shared/legal/legal-documents.ts`, que é o valor gravado em
// `User.acceptedTermsVersion` quando alguém marca a caixa.
//
// Regra que governou a redação: nada aqui pode afirmar comportamento que o
// código não tem. Em particular, e por escrito no documento: o TAYRO não
// processa pagamento, não verifica identidade nem titularidade de Instagram,
// não hospeda arquivo de conteúdo, não modera conteúdo e não tem integração
// oficial com o Instagram ou a Meta. Ver specs/legal-acceptance e o relatório
// de auditoria de 2026-09-04.
//
// AINDA FALTA PARA PUBLICAR EM PRODUÇÃO: o endereço (seção 1 da Política e
// cláusula 22) e a comarca do foro (cláusula 21). Nome/CPF preenchidos em
// 2026-09-09 (pessoa física, TAYRO ainda sem CNPJ). Os dois que faltam
// continuam marcados na página como campo a preencher, de propósito.
export default function TermsOfUsePage() {
  return (
    <LegalDocumentShell
      updatedLabel={`Versão ${TERMS_VERSION} · atualizado em ${LEGAL_UPDATED_AT}`}
      title="Termos de Uso"
      intro={
        <>
          <p>
            Estes Termos de Uso regulam o acesso e a utilização do{' '}
            <strong className="text-foreground">TAYRO</strong>, plataforma que aproxima marcas e
            creators para viabilizar parcerias de divulgação.
          </p>
          <p>
            A <strong className="text-foreground">criação de conta</strong> e o{' '}
            <strong className="text-foreground">
              envio de candidatura pelo formulário público
            </strong>{' '}
            exigem o aceite expresso destes Termos e da{' '}
            <Link
              to={PRIVACY_PATH}
              className="text-lime underline underline-offset-2 hover:text-foreground"
            >
              {PRIVACY_LABEL}
            </Link>
            , manifestado ao marcar as caixas correspondentes. Sem esse aceite, a conta não é criada
            e a candidatura não é enviada.
          </p>
          <p>
            As páginas públicas do TAYRO, como a página inicial, a vitrine de campanhas e os perfis
            públicos de creators, podem ser consultadas sem cadastro.{' '}
            <strong className="text-foreground">
              A simples visita a essas páginas não é tratada como aceite destes Termos
            </strong>
            , sem prejuízo da proteção legal aos elementos da plataforma descritos na cláusula 16 e
            das vedações previstas em lei.
          </p>
          <p>
            Se você não concorda com qualquer parte deste documento, não crie conta e não envie
            candidatura.
          </p>
        </>
      }
      footer={
        <Link
          to={PRIVACY_PATH}
          className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted transition-colors hover:text-lime"
        >
          {PRIVACY_LABEL}
        </Link>
      }
    >
      <Section id="aceitacao" title="1. Aceitação dos Termos">
        <p>
          O aceite destes Termos e da {PRIVACY_LABEL} é condição para{' '}
          <strong className="text-foreground">criar conta</strong> e para{' '}
          <strong className="text-foreground">enviar candidatura pelo formulário público</strong>,
          que é o fluxo em que uma conta é criada sem cadastro prévio (cláusula 3.4). O aceite é
          manifestado de forma ativa, marcando as caixas correspondentes, que não vêm previamente
          assinaladas. Consultar as páginas públicas não exige aceite e não é tratado como tal.
        </p>
        <p>No momento do aceite, a plataforma registra:</p>
        <List
          items={[
            'a versão destes Termos de Uso vigente naquele momento',
            `a versão da ${PRIVACY_LABEL} vigente naquele momento`,
            'a data e a hora do aceite',
            'a declaração do próprio usuário de que possui 18 anos ou mais',
          ]}
        />
        <p>
          A versão registrada é definida pela plataforma no momento do aceite, e não informada pelo
          navegador do usuário.
        </p>
        <Callout>
          <p>
            O aceite da {PRIVACY_LABEL} representa a{' '}
            <strong className="text-foreground">ciência e a aceitação daquele documento</strong>,
            conforme aplicável.
          </p>
          <p>
            Ele não constitui consentimento único e genérico para todo e qualquer tratamento de
            dados pessoais. As finalidades e as bases legais de cada tratamento estão descritas na
            própria {PRIVACY_LABEL}, e determinadas funcionalidades possuem autorização própria e
            separada, como a ativação do perfil público pelo creator.
          </p>
        </Callout>
        <p>
          Contas criadas antes de 4 de setembro de 2026, data em que este registro passou a existir,
          não possuem registro de aceite associado. Isso não afasta a aplicação destes Termos ao uso
          da plataforma a partir de sua publicação.
        </p>
      </Section>

      <Section id="sobre" title="2. Sobre o TAYRO">
        <p>
          O TAYRO é uma <strong className="text-foreground">plataforma tecnológica</strong>. Sua
          função é organizar, em um mesmo lugar, as informações que marcas e creators usam para
          decidir se querem trabalhar juntos e para acompanhar o andamento dessa parceria.
        </p>
        <p>Por meio da plataforma, atualmente é possível:</p>
        <List
          items={[
            'marcas criarem, publicarem, editarem e encerrarem campanhas',
            'creators consultarem campanhas abertas e enviarem candidaturas',
            'marcas analisarem candidaturas, com informações públicas do perfil de Instagram informado pelo creator, e aprovarem ou recusarem cada uma',
            'creators registrarem conteúdos produzidos, por meio de links, e marcas revisarem esses registros',
            'marcas registrarem recompensas combinadas e informarem resultados da parceria',
            'creators manterem um perfil e um media kit, com a opção de torná-los públicos',
          ]}
        />
        <Callout>
          <p>O TAYRO não é agência, não é intermediário financeiro e não é parte da parceria.</p>
          <p>
            Ele não representa marcas nem creators, não negocia condições em nome de ninguém e não
            garante que uma parceria será celebrada, executada ou paga. A cláusula 12 detalha esse
            ponto.
          </p>
        </Callout>
        <p>
          A plataforma está em desenvolvimento contínuo. Funcionalidades podem ser criadas,
          alteradas, limitadas ou descontinuadas, conforme a cláusula 14.
        </p>
      </Section>

      <Section id="cadastro" title="3. Cadastro e conta">
        <SubSection title="3.1. Requisitos">
          <p>
            O TAYRO é destinado exclusivamente a pessoas com{' '}
            <strong className="text-foreground">18 anos ou mais</strong>. Ao criar conta, o usuário
            declara possuir essa idade.
          </p>
          <p>
            A plataforma não solicita nem armazena data de nascimento e{' '}
            <strong className="text-foreground">
              não realiza verificação documental ou automatizada da idade
            </strong>
            . O que existe é a declaração do próprio usuário, registrada com data e hora.
          </p>
          <p>
            Constatado que a conta pertence a pessoa menor de 18 anos, o TAYRO poderá encerrá-la, na
            forma da cláusula 15.
          </p>
        </SubSection>

        <SubSection title="3.2. Informações cadastrais">
          <p>
            As informações fornecidas devem ser verdadeiras, precisas e mantidas atualizadas. O
            usuário é responsável pelo conteúdo e pela veracidade dos dados que informa, inclusive
            nome, e-mail, telefone e nome de usuário de redes sociais.
          </p>
          <p>
            O TAYRO <strong className="text-foreground">não verifica a identidade</strong> de
            creators ou de marcas, não confere documentos, não valida CNPJ e{' '}
            <strong className="text-foreground">
              não confirma se a pessoa que informa um perfil de rede social é sua titular
            </strong>
            .
          </p>
        </SubSection>

        <SubSection title="3.3. Credenciais e segurança da conta">
          <p>
            A conta é pessoal e intransferível. O usuário é responsável por manter suas credenciais
            em sigilo e por toda atividade realizada por meio da sua conta.
          </p>
          <p>
            Suspeitando de acesso não autorizado, o usuário deve alterar a senha imediatamente,
            utilizando a funcionalidade disponível na plataforma, e comunicar o TAYRO pelo canal da
            cláusula 22. A alteração de senha encerra as sessões abertas na conta.
          </p>
        </SubSection>

        <SubSection title="3.4. Candidatura sem login e criação de conta">
          <p>
            Este ponto merece atenção especial, por ser a única forma de criação de conta que ocorre
            sem cadastro prévio.
          </p>
          <Callout>
            <p>
              O link público de uma campanha permite que um creator{' '}
              <strong className="text-foreground">envie candidatura sem estar logado</strong> e sem
              ter conta anterior no TAYRO.
            </p>
            <p>
              Ao enviar essa candidatura,{' '}
              <strong className="text-foreground">
                uma conta de creator é criada com os dados informados no formulário
              </strong>{' '}
              (nome, e-mail, telefone e nome de usuário do Instagram), ou, se já existir conta
              associada àquele e-mail ou àquele nome de usuário, essa conta existente passa a ser
              utilizada.
            </p>
            <p>
              A conta criada dessa forma nasce{' '}
              <strong className="text-foreground">sem senha definida pelo usuário</strong>. Um
              e-mail é enviado ao endereço informado, com um link para que a própria pessoa defina
              sua senha e passe a acessar a conta. Esse link tem prazo de validade.
            </p>
            <p>
              O envio da candidatura por esse fluxo também exige o aceite destes Termos e da{' '}
              {PRIVACY_LABEL}, e a declaração de maioridade, nas mesmas condições da cláusula 1.
            </p>
          </Callout>
          <p>
            Enquanto a senha não for definida, a conta permanece existente e a candidatura enviada
            permanece disponível para análise da marca responsável pela campanha.
          </p>
          <p>
            Quem não deseje que uma conta seja criada não deve enviar candidatura por esse
            formulário. A exclusão da conta de creator pode ser solicitada na forma da cláusula 15 e
            da {PRIVACY_LABEL}.
          </p>
          <p>
            Não é possível alterar o papel de uma conta. Uma conta de creator não se converte em
            conta de marca, e o contrário também não ocorre.
          </p>
        </SubSection>
      </Section>

      <Section id="regras-gerais" title="4. Regras gerais de utilização">
        <p>Ao utilizar o TAYRO, o usuário se compromete a:</p>
        <List
          items={[
            'utilizar a plataforma de acordo com estes Termos, com a legislação aplicável e com a boa-fé',
            'fornecer informações verdadeiras e mantê-las atualizadas',
            'não se apresentar como outra pessoa, marca ou organização',
            'não utilizar a plataforma para finalidade ilícita, enganosa ou abusiva',
            'responder pelo conteúdo, pelos links e pelas informações que envia',
            'respeitar direitos de terceiros, incluindo direitos autorais, de imagem e de marca',
            'não tentar acessar áreas, contas ou dados a que não tenha acesso autorizado',
          ]}
        />
        <p>
          O usuário reconhece que outras pessoas utilizam a plataforma e que informações que ele
          disponibiliza em determinadas funcionalidades serão apresentadas à contraparte da
          parceria, conforme descrito na {PRIVACY_LABEL}.
        </p>
      </Section>

      <Section id="creators" title="5. Regras para creators">
        <p>O creator é responsável por:</p>
        <List
          items={[
            <>
              <strong className="text-foreground">Dados cadastrais.</strong> A veracidade e a
              atualização de nome, e-mail, telefone, cidade, nichos, biografia e demais informações
              que informar.
            </>,
            <>
              <strong className="text-foreground">Nome de usuário do Instagram.</strong> Informar
              perfil próprio, do qual seja titular ou esteja autorizado a representar. A plataforma
              apenas verifica, por meio de fonte externa, se o nome de usuário informado
              aparentemente existe, e{' '}
              <strong className="text-foreground">
                não verifica se ele pertence a quem o informou
              </strong>
              . Informar perfil de terceiro é violação destes Termos.
            </>,
            <>
              <strong className="text-foreground">Informações da candidatura.</strong> O conteúdo da
              mensagem enviada à marca e a decisão de enviá-la, ciente de que ela será apresentada à
              marca responsável pela campanha.
            </>,
            <>
              <strong className="text-foreground">Conteúdo registrado.</strong> O conteúdo produzido
              e as informações registradas na plataforma sobre ele, na forma da cláusula 8.
            </>,
            <>
              <strong className="text-foreground">Links externos.</strong> Os endereços que informa,
              incluindo o destino, a disponibilidade e as permissões de acesso desses endereços. O
              TAYRO não controla, não revisa e não se responsabiliza pelo conteúdo hospedado em
              serviços de terceiros.
            </>,
            <>
              <strong className="text-foreground">Condições combinadas com a marca.</strong> O
              cumprimento das obrigações que assumir diretamente com uma marca, incluindo prazos,
              formato de entrega, exclusividade, publicidade e demais condições combinadas entre as
              partes, dentro ou fora da plataforma.
            </>,
            <>
              <strong className="text-foreground">Regras de publicidade.</strong> A observância da
              legislação e das normas aplicáveis à divulgação de produtos e serviços, incluindo a
              identificação de conteúdo publicitário, e das regras das plataformas onde publica.
            </>,
          ]}
        />
        <p>
          O creator reconhece que a aprovação de uma candidatura não garante recebimento de valores,
          produtos ou qualquer outra contrapartida, e que a contrapartida é obrigação da marca, na
          forma das cláusulas 11 e 12.
        </p>
      </Section>

      <Section id="marcas" title="6. Regras para marcas">
        <p>A marca é responsável por:</p>
        <List
          items={[
            <>
              <strong className="text-foreground">Informações da campanha.</strong> Título,
              descrição, briefing, prazos, número de vagas, nichos e demais informações publicadas,
              que devem ser verdadeiras, claras e não enganosas.
            </>,
            <>
              <strong className="text-foreground">Termos da oferta.</strong> A oferta apresentada
              aos creators, incluindo valor, produto, percentual de comissão, prazo e descrição, e
              seu cumprimento perante o creator cuja candidatura for aprovada.
            </>,
            <>
              <strong className="text-foreground">Informações prestadas a creators.</strong> Tudo o
              que informar aos creators dentro ou fora da plataforma, incluindo feedbacks e
              orientações sobre o conteúdo.
            </>,
            <>
              <strong className="text-foreground">Decisões sobre candidaturas.</strong> A aprovação
              ou a recusa de cada candidatura é decisão exclusiva da marca. O TAYRO não decide, não
              recomenda de forma vinculante e não interfere nessa escolha.
            </>,
            <>
              <strong className="text-foreground">Recompensas registradas.</strong> A veracidade dos
              registros de recompensa e de seus estados, e o efetivo cumprimento do que foi
              combinado, na forma da cláusula 11.
            </>,
            <>
              <strong className="text-foreground">Resultados informados.</strong> A veracidade dos
              números e das informações de resultado que registrar, e a decisão de autorizar sua
              exibição no perfil público do creator.
            </>,
            <>
              <strong className="text-foreground">Uso dos dados dos creators.</strong> O tratamento
              dos dados pessoais de creators que receber por meio da plataforma, para suas próprias
              finalidades, observada a legislação de proteção de dados.
            </>,
          ]}
        />
        <p>
          A marca reconhece que as informações de Instagram exibidas na plataforma são obtidas de
          fonte externa, são estimativas ou reproduções de dados públicos, podem estar
          desatualizadas ou indisponíveis e{' '}
          <strong className="text-foreground">não são auditadas pelo TAYRO</strong>, na forma da
          cláusula 9.
        </p>
      </Section>

      <Section id="campanhas" title="7. Campanhas e candidaturas">
        <p>O fluxo atual da plataforma é o seguinte:</p>
        <List
          items={[
            'a marca cria uma campanha, que começa como rascunho, e a publica quando quiser',
            'a campanha publicada passa a ser exibida na vitrine de campanhas abertas e a ter um link público próprio',
            'o creator consulta a campanha e envia sua candidatura, com uma mensagem opcional',
            'a marca analisa a candidatura e a aprova ou recusa',
            'a plataforma busca comunicar o creator da decisão por e-mail, sem que a entrega da mensagem possa ser garantida',
            'aprovada a candidatura, o creator pode registrar conteúdos, informando o link do conteúdo produzido',
            'a marca revisa o conteúdo registrado e pode aprová-lo, recusá-lo ou solicitar revisão, com um comentário',
            'a marca pode registrar recompensas relacionadas à parceria e informar o resultado obtido',
          ]}
        />
        <p>
          Cada campanha possui um número de vagas, que corresponde à quantidade de candidaturas que
          a marca pretende aprovar. Ele não limita quantas candidaturas podem ser recebidas.
        </p>
        <p>
          Um creator pode enviar apenas uma candidatura por campanha. A candidatura retirada pelo
          creator não pode ser reenviada para a mesma campanha.
        </p>
        <Callout>
          <p>
            A plataforma não possui assinatura eletrônica, aceite formal de oferta, contrato
            eletrônico ou registro de anuência específica por campanha.
          </p>
          <p>
            A aprovação de uma candidatura é um{' '}
            <strong className="text-foreground">registro de decisão da marca</strong> dentro da
            plataforma. Ela não constitui, por si, contrato entre marca e creator, nem gera
            automaticamente obrigação contratual por ato do TAYRO.
          </p>
          <p>
            As obrigações entre marca e creator decorrem do que as partes combinarem entre si e da
            legislação aplicável.
          </p>
        </Callout>
        <p>
          A marca pode encerrar uma campanha e pode apagar campanha que ainda esteja em rascunho.
          Campanha encerrada deixa de receber candidaturas.
        </p>
      </Section>

      <Section id="conteudo" title="8. Conteúdo enviado pelos usuários">
        <SubSection title="8.1. Como o registro de conteúdo funciona hoje">
          <Callout>
            <p>
              O TAYRO <strong className="text-foreground">não hospeda arquivos de conteúdo</strong>.
              A plataforma não possui upload de vídeo, foto ou documento.
            </p>
            <p>
              O creator informa um <strong className="text-foreground">endereço (link)</strong> onde
              o conteúdo está disponível, hospedado em serviço de terceiro escolhido por ele. A
              plataforma armazena esse endereço, o tipo de mídia, uma legenda opcional, o estado da
              revisão e o comentário da marca.
            </p>
            <p>
              A disponibilidade, a permanência, a segurança e o controle de acesso do conteúdo
              dependem do serviço onde ele está hospedado, e não do TAYRO. Se o link for removido,
              expirar ou tiver seu acesso restringido, a plataforma não terá como exibir o conteúdo.
            </p>
          </Callout>
          <p>
            O creator é responsável por decidir o que torna acessível por meio do endereço que
            informa, inclusive quanto às permissões de acesso configuradas naquele serviço.
          </p>
        </SubSection>

        <SubSection title="8.2. Declaração de titularidade e direitos">
          <p>
            Ao registrar um conteúdo, informar um link, enviar uma legenda ou publicar qualquer
            informação na plataforma, o usuário declara que:
          </p>
          <List
            items={[
              'possui os direitos necessários sobre aquele conteúdo, ou está devidamente autorizado a utilizá-lo e a disponibilizá-lo para as finalidades da plataforma',
              'obteve as autorizações de imagem, voz e demais direitos de personalidade de todas as pessoas que apareçam no conteúdo',
              'o conteúdo não viola direitos de terceiros nem a legislação aplicável',
            ]}
          />
          <p>
            O usuário permanece titular dos direitos sobre o conteúdo que produz. Estes Termos não
            transferem a propriedade desse conteúdo ao TAYRO.
          </p>
        </SubSection>

        <SubSection title="8.3. Licença concedida ao TAYRO">
          <p>
            Para que a plataforma funcione, o usuário concede ao TAYRO uma licença{' '}
            <strong className="text-foreground">
              gratuita, não exclusiva e limitada ao necessário
            </strong>{' '}
            para:
          </p>
          <List
            items={[
              'armazenar as informações e as referências (links) que ele registrar',
              'processar e organizar essas informações dentro das funcionalidades utilizadas',
              'exibir essas informações às pessoas que, pelas funcionalidades da plataforma, devem ter acesso a elas, como a marca responsável pela campanha em que o creator se candidatou',
              'exibir as informações que o creator optar por tornar públicas, enquanto essa opção estiver ativa',
              'realizar cópias técnicas necessárias à operação, à segurança e à recuperação do serviço',
            ]}
          />
          <p>
            Esta licença existe apenas para viabilizar as funcionalidades descritas nestes Termos.
            Ela não autoriza o TAYRO a comercializar o conteúdo do usuário, a licenciá-lo a
            terceiros para finalidade própria destes, nem a utilizá-lo em publicidade do TAYRO sem
            autorização específica do usuário.
          </p>
          <p>
            A licença se extingue com a remoção do conteúdo ou com o encerramento da conta,
            ressalvadas as hipóteses de conservação descritas na {PRIVACY_LABEL} e a licença
            necessária a cópias técnicas ainda existentes.
          </p>
        </SubSection>

        <SubSection title="8.4. Ausência de moderação">
          <Callout>
            <p>
              O TAYRO <strong className="text-foreground">não realiza moderação prévia</strong>,
              curadoria, auditoria ou revisão editorial do conteúdo, dos links e das informações
              registradas pelos usuários, e não possui canal estruturado de denúncia dentro da
              plataforma.
            </p>
            <p>
              A revisão de conteúdo existente na plataforma é feita{' '}
              <strong className="text-foreground">pela marca</strong>, no âmbito da sua parceria, e
              tem efeito apenas sobre aquela parceria.
            </p>
          </Callout>
          <p>
            <strong className="text-foreground">
              Não há obrigação geral de monitoramento prévio
            </strong>
            . O TAYRO poderá adotar medidas sobre conteúdos ou informações que violem estes Termos
            ou a legislação aplicável, nos limites de suas possibilidades técnicas e das obrigações
            legais que lhe sejam impostas, incluindo as medidas da cláusula 15.
          </p>
          <p>
            Tomando conhecimento de conteúdo ilícito ou violador de direitos, o usuário pode
            comunicar o TAYRO pelo canal da cláusula 22. Não existe, hoje, canal estruturado de
            denúncia dentro da plataforma, e o atendimento a essas comunicações ocorre conforme as
            possibilidades operacionais do TAYRO.
          </p>
        </SubSection>
      </Section>

      <Section id="instagram" title="9. Informações de Instagram e serviços de terceiros">
        <Callout>
          <p>
            O TAYRO <strong className="text-foreground">não possui integração oficial</strong> com o
            Instagram, com a Meta ou com qualquer de suas empresas, e{' '}
            <strong className="text-foreground">não é parceiro, afiliado ou autorizado</strong> por
            elas.
          </p>
          <p>
            As informações de perfil exibidas na plataforma são obtidas de{' '}
            <strong className="text-foreground">provedor externo não oficial</strong>, a partir de
            informações publicamente disponíveis no perfil informado pelo creator.
          </p>
        </Callout>
        <p>Sobre essas informações, o usuário reconhece que:</p>
        <List
          items={[
            'a disponibilidade, a completude, a atualidade e a precisão dependem da fonte externa e do próprio perfil consultado, e estão fora do controle do TAYRO',
            'as informações podem estar desatualizadas, incompletas ou indisponíveis, temporária ou definitivamente',
            'a consulta pode falhar, e a plataforma pode exibir a última informação obtida ou indicar que a informação não está disponível',
            'a taxa de engajamento apresentada é uma estimativa calculada pelo TAYRO a partir de curtidas e comentários públicos das publicações recentes consultadas, e não é uma métrica oficial do Instagram',
            'a verificação feita sobre um nome de usuário informado apenas indica se ele aparentemente existe na fonte consultada, e não confirma titularidade, autenticidade ou veracidade de qualquer informação',
            'nenhuma dessas informações é auditada, certificada ou garantida pelo TAYRO',
          ]}
        />
        <p>
          A indicação de que uma conta é verificada em rede social, quando existir, é atribuição da
          própria rede social, e não do TAYRO.
        </p>
        <p>
          A alteração das condições de acesso a essas informações pela rede social ou pelo provedor
          externo pode limitar ou interromper a funcionalidade, na forma da cláusula 14.
        </p>
        <p>
          O tratamento de dados pessoais decorrente dessas consultas está descrito na{' '}
          {PRIVACY_LABEL}.
        </p>
      </Section>

      <Section id="perfil-publico" title="10. Perfil público do creator">
        <p>
          O perfil público é uma funcionalidade opcional do creator. Ele{' '}
          <strong className="text-foreground">nasce desativado</strong> e só passa a existir quando
          o próprio creator o ativa.
        </p>
        <p>
          Ativado, o perfil se torna acessível por um endereço público, sem necessidade de login, e
          passa a exibir as seguintes informações, conforme estejam preenchidas:
        </p>
        <List
          items={[
            'nome e nome de usuário do Instagram',
            'foto de perfil obtida do Instagram, ou a imagem que o creator tiver informado',
            'biografia, cidade e nichos',
            'telefone informado pelo creator',
            'número de seguidores e a estimativa de engajamento calculada pelo TAYRO',
            'publicações recentes obtidas do Instagram',
            'a quantidade de parcerias concluídas, calculada pela regra informada na própria página',
            'resultados de parcerias, apenas nas condições do item seguinte',
          ]}
        />
        <p>
          Um resultado de parceria só aparece no perfil público quando{' '}
          <strong className="text-foreground">as duas condições</strong> estiverem atendidas: a
          marca que o informou autorizou sua exibição pública, e o creator não o ocultou. A
          autorização da marca nasce desativada.
        </p>
        <p>
          O creator sempre pode consultar, na sua própria conta, os resultados informados pelas
          marcas, independentemente de estarem visíveis publicamente.
        </p>
        <p>
          Enquanto o perfil público estiver desativado, o endereço público não exibe o perfil, e as
          imagens de perfil e de publicações associadas ao creator não são disponibilizadas ao
          público.
        </p>
        <p>
          A desativação do perfil público não alcança informações que já tenham sido visualizadas,
          copiadas, indexadas por mecanismos de busca ou armazenadas por terceiros enquanto o perfil
          estava ativo. O TAYRO não tem controle sobre cópias feitas por terceiros.
        </p>
      </Section>

      <Section id="recompensas" title="11. Recompensas e registros de pagamentos">
        <Callout>
          <p>
            O TAYRO <strong className="text-foreground">não processa pagamentos</strong>.
          </p>
          <p>
            A plataforma não possui, e não opera por meio de, gateway de pagamento, Pix, cartão de
            crédito ou débito, boleto, carteira digital, conta de pagamento, custódia de valores
            (escrow), divisão de valores (split) ou qualquer forma de intermediação financeira.
            Nenhum valor transita pelo TAYRO.
          </p>
          <p>
            A funcionalidade de recompensas é um{' '}
            <strong className="text-foreground">registro informativo</strong>: ela guarda o que a
            marca declara sobre a contrapartida combinada e o estado em que essa contrapartida se
            encontra, segundo a própria marca.
          </p>
        </Callout>
        <p>
          Os estados possíveis de uma recompensa são definidos e alterados exclusivamente pela
          marca. Em especial:
        </p>
        <List
          items={[
            <>
              O estado <strong className="text-foreground">"Emitida"</strong>, e qualquer estado
              equivalente, significa apenas que{' '}
              <strong className="text-foreground">a marca declarou</strong> aquele estado na
              plataforma.
            </>,
            <>
              Esse estado <strong className="text-foreground">não é comprovante</strong> de
              pagamento, de transferência, de envio ou de entrega, e não é verificado, confirmado ou
              atestado pelo TAYRO.
            </>,
            <>
              O TAYRO <strong className="text-foreground">não garante</strong> o pagamento, o envio,
              a entrega, o prazo, o valor ou a qualidade de qualquer contrapartida.
            </>,
          ]}
        />
        <p>
          O mesmo se aplica aos resultados de parceria: os números informados são{' '}
          <strong className="text-foreground">declarados pela marca</strong>, não são medidos nem
          auditados pelo TAYRO, e são apresentados com a indicação de quem os informou.
        </p>
        <p>
          Obrigações tributárias, fiscais, trabalhistas e previdenciárias decorrentes da relação
          entre marca e creator são de responsabilidade das partes envolvidas. O TAYRO não emite
          notas fiscais, recibos ou documentos fiscais relativos a essas contrapartidas, e não
          realiza retenção de tributos.
        </p>
      </Section>

      <Section id="relacao" title="12. Relação entre marcas e creators">
        <p>
          A parceria é celebrada e executada{' '}
          <strong className="text-foreground">diretamente entre a marca e o creator</strong>. O
          TAYRO disponibiliza a ferramenta que organiza essa interação e{' '}
          <strong className="text-foreground">não é parte dessa relação</strong>.
        </p>
        <p>Nos limites permitidos pela legislação aplicável, o TAYRO:</p>
        <List
          items={[
            'não garante o pagamento ou qualquer outra contrapartida combinada entre as partes',
            'não garante a entrega, a produção, a publicação ou a manutenção de qualquer conteúdo',
            'não garante a execução da campanha, o cumprimento de prazos ou a continuidade da parceria',
            'não fiscaliza o cumprimento das obrigações assumidas pelas partes',
            'não media, arbitra ou resolve conflitos entre marca e creator, e não possui canal de mediação ou de disputa',
            'não garante resultado, alcance, retorno, faturamento, engajamento ou qualquer desempenho comercial',
            'não garante que uma campanha receberá candidaturas, nem que uma candidatura será aprovada',
            'não assume obrigação de resultado perante nenhuma das partes',
          ]}
        />
        <p>
          A aprovação de uma candidatura, o registro de um conteúdo, o registro de uma recompensa e
          o registro de um resultado são <strong className="text-foreground">registros</strong> de
          atos praticados pelos próprios usuários na plataforma. Eles não representam manifestação,
          concordância, garantia ou atestação do TAYRO quanto ao seu conteúdo.
        </p>
        <p>
          Conflitos relacionados à parceria devem ser resolvidos diretamente entre marca e creator,
          pelos meios legais disponíveis. O TAYRO poderá, quando obrigado por lei ou por
          determinação de autoridade competente, fornecer informações que possua.
        </p>
      </Section>

      <Section id="condutas-proibidas" title="13. Condutas proibidas">
        <p>É vedado ao usuário, entre outras condutas:</p>
        <List
          items={[
            'fornecer informação falsa, imprecisa ou enganosa, inclusive sobre identidade, titularidade de perfil, métricas ou contrapartidas',
            'apresentar-se como outra pessoa, marca ou organização, ou informar perfil de rede social de terceiro como se fosse seu',
            'criar contas com a finalidade de fraudar, manipular resultados, burlar limites ou contornar restrições',
            'utilizar a plataforma para finalidade ilícita, para prática de fraude ou para qualquer atividade vedada pela legislação',
            'publicar ou registrar conteúdo ilícito, discriminatório, violento, sexualmente explícito envolvendo menores, ou que viole direitos de terceiros',
            'enviar spam, mensagens em massa, propaganda não solicitada ou comunicações abusivas a outros usuários',
            'manipular métricas, engajamento, resultados ou informações registradas na plataforma',
            'assediar, ameaçar, ofender ou constranger outros usuários',
            'coletar dados de outros usuários por meios automatizados, incluindo raspagem (scraping), sem autorização expressa',
            'tentar acessar contas, dados, áreas administrativas ou sistemas sem autorização',
            'explorar, testar ou divulgar vulnerabilidades sem comunicação prévia ao TAYRO, ou sobrecarregar, interromper ou comprometer a plataforma e sua infraestrutura',
            'realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma, salvo nas hipóteses legalmente permitidas',
            'reproduzir, copiar ou explorar a plataforma, sua interface ou seus elementos para criar produto ou serviço concorrente',
          ]}
        />
      </Section>

      <Section id="disponibilidade" title="14. Disponibilidade e alterações da plataforma">
        <p>
          O TAYRO é fornecido no estado em que se encontra e{' '}
          <strong className="text-foreground">
            não assume compromisso de disponibilidade contínua
          </strong>
          . Não há garantia de tempo de funcionamento (uptime), nível de serviço acordado (SLA),
          prazo de atendimento ou canal de suporte com prazo de resposta garantido.
        </p>
        <p>A plataforma pode ficar indisponível, total ou parcialmente, em razão de:</p>
        <List
          items={[
            'manutenção, atualização, correção ou evolução do serviço',
            'falha, indisponibilidade ou alteração de serviços de terceiros dos quais a plataforma depende, incluindo hospedagem, banco de dados, envio de e-mails e consulta a informações de redes sociais',
            'falha de conexão, de rede ou de equipamentos do usuário',
            'caso fortuito, força maior ou evento fora do controle razoável do TAYRO',
          ]}
        />
        <p>
          Funcionalidades podem ser criadas, modificadas, limitadas, suspensas ou descontinuadas a
          qualquer momento. Sendo a alteração relevante, o TAYRO buscará comunicá-la por meio
          apropriado, como e-mail ou aviso na plataforma.
        </p>
        <p>
          O TAYRO poderá estabelecer limites técnicos de uso, incluindo limitação de requisições,
          com a finalidade de proteger a plataforma e seus usuários.
        </p>
      </Section>

      <Section id="suspensao" title="15. Suspensão e encerramento de conta">
        <SubSection title="15.1. Encerramento pelo usuário">
          <p>
            O creator pode solicitar a exclusão da sua conta diretamente na plataforma, pela
            funcionalidade disponível no Perfil, que exige confirmação da senha.
          </p>
          <p>
            A marca pode solicitar a exclusão da conta pelo canal de contato da cláusula 22,
            enquanto não houver funcionalidade equivalente disponível.
          </p>
          <p>
            Os efeitos da exclusão sobre os dados pessoais, incluindo o que é removido, o que é
            anonimizado e o que pode ser conservado, estão descritos na {PRIVACY_LABEL}. A exclusão
            da conta não elimina automaticamente todos os registros relacionados às parcerias já
            realizadas.
          </p>
        </SubSection>

        <SubSection title="15.2. Suspensão e encerramento pelo TAYRO">
          <p>
            O TAYRO poderá suspender o acesso ou encerrar a conta, total ou parcialmente, com ou sem
            aviso prévio conforme a gravidade e a urgência do caso, quando identificar:
          </p>
          <List
            items={[
              'fraude, tentativa de fraude ou indício relevante de fraude',
              'uso abusivo da plataforma ou de seus recursos',
              'utilização para finalidade ilícita ou contrária à legislação',
              'violação destes Termos ou da legislação aplicável',
              'tentativa de comprometer, sobrecarregar, invadir ou explorar vulnerabilidade da plataforma',
              'envio de spam, mensagens em massa ou comunicações abusivas',
              'manipulação de métricas, de resultados ou de informações registradas',
              'conduta que prejudique outros usuários, o TAYRO ou terceiros',
              'informação cadastral falsa, inclusive quanto à idade declarada',
              'determinação legal ou de autoridade competente',
            ]}
          />
          <p>
            Sendo possível e adequado ao caso, o TAYRO poderá, antes de encerrar a conta, solicitar
            esclarecimentos ou notificar o usuário para regularização.
          </p>
          <p>
            Estas são faculdades do TAYRO para proteção da plataforma e de seus usuários, e{' '}
            <strong className="text-foreground">
              não criam obrigação de monitoramento, de moderação ou de fiscalização
            </strong>{' '}
            do comportamento dos usuários, conforme a cláusula 8.4.
          </p>
          <p>
            O encerramento da conta não afasta as responsabilidades assumidas pelo usuário antes do
            encerramento, nem as obrigações que ele tenha perante a contraparte de uma parceria.
          </p>
        </SubSection>
      </Section>

      <Section id="propriedade-intelectual" title="16. Propriedade intelectual">
        <p>
          São de titularidade do TAYRO, ou de quem lhe tenha licenciado, todos os elementos
          proprietários da plataforma, incluindo:
        </p>
        <List
          items={[
            'o código-fonte, o software, a arquitetura e a documentação técnica',
            'o nome e a marca TAYRO, seus sinais distintivos e seu logotipo',
            'a identidade visual, o design, a interface, a organização das telas e os elementos gráficos',
            'os textos próprios da plataforma, incluindo os desta página',
            'os nomes de domínio associados ao serviço',
            'as bases de dados e as estruturas desenvolvidas pelo TAYRO, ressalvados os dados pessoais dos titulares e o conteúdo dos usuários',
          ]}
        />
        <p>
          O acesso à plataforma não transfere ao usuário qualquer direito sobre esses elementos.
          Fica vedada a reprodução, a distribuição, a modificação ou a exploração deles sem
          autorização expressa e por escrito.
        </p>
        <Callout>
          <p>
            O conteúdo criado e registrado pelos usuários{' '}
            <strong className="text-foreground">não pertence ao TAYRO</strong>.
          </p>
          <p>
            Cada usuário permanece titular do que produz. O TAYRO recebe apenas a licença limitada
            da cláusula 8.3, necessária ao funcionamento das funcionalidades utilizadas.
          </p>
        </Callout>
        <p>
          Marcas, logotipos e nomes de terceiros que apareçam na plataforma pertencem aos seus
          respectivos titulares, e sua exibição não indica vínculo, patrocínio ou aprovação, salvo
          quando expressamente informado.
        </p>
      </Section>

      <Section id="terceiros" title="17. Serviços de terceiros">
        <p>
          O funcionamento do TAYRO depende de serviços fornecidos por terceiros, entre eles
          hospedagem da aplicação, banco de dados, envio de e-mails transacionais, monitoramento de
          erros e consulta a informações públicas de redes sociais.
        </p>
        <p>
          A indisponibilidade, a alteração, a limitação ou a descontinuação de qualquer desses
          serviços pode afetar, temporária ou definitivamente, funcionalidades da plataforma. O
          TAYRO não controla esses serviços e não responde por atos ou omissões de seus
          fornecedores, nos limites permitidos pela legislação aplicável.
        </p>
        <p>
          A plataforma também pode conter links para sites e serviços de terceiros, incluindo os
          endereços informados pelos próprios usuários. O TAYRO não controla e não revisa esses
          destinos, e o acesso a eles é de responsabilidade do usuário, sujeito aos termos e às
          políticas de cada terceiro.
        </p>
        <p>
          A relação dos fornecedores que podem tratar dados pessoais, com a respectiva finalidade,
          está na {PRIVACY_LABEL}.
        </p>
      </Section>

      <Section id="privacidade" title="18. Privacidade e proteção de dados">
        <p>
          O tratamento de dados pessoais realizado pelo TAYRO está descrito na{' '}
          <Link
            to={PRIVACY_PATH}
            className="text-lime underline underline-offset-2 hover:text-foreground"
          >
            {PRIVACY_LABEL}
          </Link>
          , que integra estes Termos.
        </p>
        <p>
          A plataforma disponibiliza funcionalidades relacionadas aos direitos do titular, incluindo
          exportação dos dados associados à conta, alteração de senha e de e-mail, controle sobre a
          exibição do perfil público e, para creators, exclusão da conta. As demais solicitações
          podem ser feitas pelo canal de contato da cláusula 22.
        </p>
        <p>
          Ao utilizar funcionalidades que apresentam informações do creator à marca, e o contrário,
          o usuário reconhece que esse compartilhamento é necessário à finalidade da funcionalidade
          e que a contraparte poderá tratar esses dados para suas próprias finalidades, na forma da{' '}
          {PRIVACY_LABEL} e da legislação aplicável.
        </p>
      </Section>

      <Section id="responsabilidade" title="19. Limitação de responsabilidade">
        <p>
          O TAYRO responde pelos danos que causar por atos próprios, nos termos da legislação
          aplicável, incluindo, quando aplicável, o Código de Defesa do Consumidor e a Lei Geral de
          Proteção de Dados Pessoais. Nada nestes Termos afasta direitos que a legislação assegure
          como irrenunciáveis.
        </p>
        <p>Nos limites permitidos pela legislação aplicável, o TAYRO não responde por:</p>
        <List
          items={[
            'o descumprimento, por marca ou creator, das obrigações assumidas entre si, incluindo pagamento, envio de produto, prazos e entrega de conteúdo',
            'a veracidade, a exatidão e a licitude das informações fornecidas pelos usuários, incluindo informações de campanha, de oferta, de candidatura, de conteúdo, de recompensa e de resultado',
            'a inexatidão, a desatualização ou a indisponibilidade de informações obtidas de fontes externas, na forma da cláusula 9',
            'o conteúdo, a disponibilidade e a segurança de sites e serviços de terceiros acessados por links informados pelos usuários',
            'danos decorrentes de indisponibilidade, falha ou interrupção de serviços de terceiros dos quais a plataforma depende',
            'a decisão de uma marca de aprovar ou recusar uma candidatura, e a decisão de um creator de se candidatar ou não a uma campanha',
            'resultados comerciais, alcance, retorno financeiro ou desempenho de qualquer campanha ou parceria',
            'condutas de outros usuários, dentro ou fora da plataforma',
            'uso das credenciais do usuário por terceiro, quando decorrente de falha do usuário em mantê-las em sigilo',
          ]}
        />
        <p>
          O usuário é responsável pelos danos que causar ao TAYRO, a outros usuários ou a terceiros
          em razão de violação destes Termos ou da legislação aplicável.
        </p>
      </Section>

      <Section id="alteracoes" title="20. Alterações destes Termos">
        <p>
          Estes Termos podem ser alterados para refletir mudanças nas funcionalidades da plataforma,
          nos serviços utilizados ou na legislação aplicável.
        </p>
        <p>
          Cada versão publicada é identificada por um número de versão e por uma data, informados no
          início desta página. A versão vigente é a publicada nesta página.
        </p>
        <p>
          Sendo a alteração relevante, o TAYRO buscará comunicá-la por e-mail, por aviso na
          plataforma ou por outro meio apropriado, e poderá solicitar novo aceite. Discordando da
          nova versão, o usuário deve interromper o uso da plataforma e pode solicitar o
          encerramento da conta na forma da cláusula 15.
        </p>
      </Section>

      <Section id="lei-aplicavel" title="21. Lei aplicável e foro">
        <p>
          Estes Termos são regidos pela legislação brasileira. O idioma destes Termos é o português
          do Brasil.
        </p>
        <p>
          Fica eleito o foro da comarca abaixo indicada para dirimir controvérsias decorrentes
          destes Termos, sem prejuízo do direito de o usuário consumidor demandar no foro do seu
          domicílio, nos termos da legislação aplicável.
        </p>
        <Placeholder>
          <p className="font-medium text-foreground">
            [COMARCA / FORO, a preencher antes da publicação em produção]
          </p>
        </Placeholder>
        <p>
          Antes de recorrer às vias judiciais, as partes poderão buscar solução amigável pelo canal
          de contato da cláusula 22.
        </p>
      </Section>

      <Section id="contato" title="22. Contato">
        <p>
          Para dúvidas, comunicações, solicitações ou reclamações relacionadas a estes Termos ou ao
          uso da plataforma, entre em contato:
        </p>
        <ContactLink />
        <p>
          A identificação completa do responsável pela plataforma consta da seção 1 da{' '}
          <Link
            to={PRIVACY_PATH}
            className="text-lime underline underline-offset-2 hover:text-foreground"
          >
            {PRIVACY_LABEL}
          </Link>
          .
        </p>
        <Placeholder>
          <p className="font-medium text-foreground">Pedro Soares de Souza Garcia</p>
          <p>CPF: 119.407.186-43</p>
          <p>[ENDEREÇO, a preencher antes da publicação em produção]</p>
          <p>E-mail: {LEGAL_CONTACT_EMAIL}</p>
        </Placeholder>
      </Section>
    </LegalDocumentShell>
  );
}
