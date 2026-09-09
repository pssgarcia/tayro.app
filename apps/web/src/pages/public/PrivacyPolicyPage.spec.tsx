import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { changeLocale } from '../../i18n';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import { TERMS_PATH, PRIVACY_VERSION } from '../../config/legal';

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPolicyPage />
    </MemoryRouter>,
  );
}

/** Texto corrido da página, para as asserções de conteúdo do documento. */
function documentText() {
  return document.body.textContent ?? '';
}

describe('PrivacyPolicyPage', () => {
  it('tem o título e a versão do documento', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Versão ${PRIVACY_VERSION}`))).toBeInTheDocument();
  });

  it('tem as 19 seções numeradas', () => {
    renderPage();

    const secoes = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
    expect(secoes).toHaveLength(19);
    expect(secoes[0]).toMatch(/^1\. Quem somos e quem é o controlador$/);
    expect(secoes[18]).toMatch(/^19\. Contato$/);
  });

  // ─── Exatidão em relação ao código ──────────────────────────────────────────

  it('lista os dados de creator realmente coletados', () => {
    renderPage();
    const texto = documentText();

    ['nome', 'e-mail', 'telefone', 'cidade', 'biografia'].forEach((campo) =>
      expect(texto).toContain(campo),
    );
    expect(texto).toMatch(/nome de usuário \(@\) do Instagram/i);
    expect(texto).toMatch(/nichos de atuação/i);
    expect(texto).toMatch(/hash/i);
  });

  it('diz que o TikTok é coletado mas não exibido a marcas nem no perfil público', () => {
    renderPage();
    const texto = documentText();

    // Fato do código: `tiktokHandle` não está em `influencerSelect` nem em
    // `getPublicProfile`. Informar o campo sem essa ressalva daria a impressão
    // errada de que ele circula.
    expect(texto).toMatch(/nome de usuário do TikTok/i);
    expect(texto).toMatch(/não é exibido às marcas nem no perfil público/i);
  });

  it('descreve as métricas de Instagram como estimativa própria, não dado oficial', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não são dados oficiais do Instagram/i);
    expect(texto).toMatch(/estimativa de taxa de engajamento/i);
    expect(texto).toMatch(/não uma métrica oficial/i);
    expect(texto).toMatch(/cópias das próprias imagens/i);
  });

  it('diz que as imagens são buscadas pelo nosso servidor, não pelo navegador', () => {
    renderPage();
    const texto = documentText();

    // Deixou de ser verdade que o navegador fala com a CDN do Instagram
    // (D-18). Descrever ao contrário informaria um compartilhamento que não
    // acontece.
    expect(texto).toMatch(/pelos nossos servidores/i);
    expect(texto).toMatch(/não se conecta à rede de distribuição do Instagram/i);
  });

  it('não promete de forma absoluta que não há dado sensível', () => {
    renderPage();
    const texto = documentText();

    // A negativa forte vale para os CAMPOS (que de fato não existem), não para
    // o conteúdo: qualquer pessoa pode escrever o que quiser numa bio ou numa
    // mensagem de candidatura, e a plataforma não tem como impedir.
    expect(texto).toMatch(/campos destinados a coletar/i);
    expect(texto).toMatch(/não solicita deliberadamente dados pessoais sensíveis/i);
    expect(texto).toMatch(/campos de texto livre/i);
    expect(texto).toMatch(/o tratamento observará a legislação aplicável/i);
    // Justamente a promessa absoluta que não pode voltar.
    expect(texto).not.toMatch(/não coleta.{0,40}dados pessoais sensíveis/i);
  });

  it('não apresenta as bases legais como parecer definitivo', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/base legal aplicável à sua respectiva finalidade/i);
    expect(texto).toMatch(/não autoriza genericamente qualquer tratamento/i);
    expect(texto).toMatch(/solicitado de forma específica e separada/i);
    expect(texto).toMatch(/pode ser revogada a qualquer momento/i);
    expect(texto).toMatch(/não pretende esgotar a análise de cada operação/i);
  });

  it('lista os terceiros que realmente recebem dados', () => {
    renderPage();
    const texto = documentText();

    ['Neon', 'Railway', 'Vercel', 'Resend', 'Sentry', 'RapidAPI', 'GitHub'].forEach((fornecedor) =>
      expect(texto).toContain(fornecedor),
    );
  });

  it('não lista terceiro que não está em uso', () => {
    renderPage();
    const texto = documentText();

    // Cloudflare R2 tem credenciais provisionadas e ZERO código. Analytics e
    // gateway não existem. Listar qualquer um seria informar tratamento
    // inexistente.
    expect(texto).not.toMatch(/Cloudflare/i);
    expect(texto).not.toMatch(/Google Analytics/i);
    expect(texto).not.toMatch(/Stripe|Mercado Pago|PagSeguro|Asaas/i);
    expect(texto).toMatch(/não utiliza.*provedor de pagamento/is);
  });

  it('não lista fornecedor externo de fontes, que deixou de existir', () => {
    renderPage();
    const texto = documentText();

    // As fontes passaram a ser hospedadas por nós em 2026-09-04, então o Google
    // deixou de receber IP, user-agent e referer do visitante. Manter a seção
    // informaria um compartilhamento que não acontece mais. O contrário (o
    // <link> voltar sem a seção voltar) é travado por tipografia-local.test.ts.
    expect(texto).not.toMatch(/Google Fonts/i);
    expect(texto).not.toMatch(/servidores do Google/i);
    expect(texto).toMatch(/servidas pelo próprio domínio do TAYRO/i);
    expect(texto).toMatch(/não estabelece conexão com nenhum fornecedor externo de fontes/i);
  });

  it('diz que o e-mail das partes não é entregue à contraparte', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não é disponibilizado à contraparte/i);
  });

  it('descreve o consentimento como base de algumas finalidades, não de todas', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/art\. 7º, V/);
    expect(texto).toMatch(/art\. 7º, IX/);
    expect(texto).toMatch(/art\. 7º, I\)/);
    expect(texto).toMatch(/não é um consentimento genérico/i);
  });

  it('descreve o perfil público como desativado por padrão, com o telefone junto', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/nasce desativado/i);
    expect(texto).toMatch(/telefone é publicado junto/i);
    expect(texto).toMatch(/Não há opção separada para publicar o perfil sem o telefone/i);
    expect(texto).toMatch(/e-mail nunca é exibido/i);
  });

  it('diz que as imagens deixam de ser públicas quando o perfil é desativado', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não são acessíveis publicamente/i);
    expect(texto).toMatch(/restrito ao próprio creator e às marcas/i);
  });

  // ─── Exclusão: o ponto mais fácil de exagerar ───────────────────────────────

  it('não promete exclusão total, e diz o que permanece', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não é a eliminação integral de todos os registros/i);
    expect(texto).toMatch(/candidaturas enviadas/i);
    expect(texto).toMatch(/recompensas registradas/i);
    expect(texto).toMatch(/resultados de parceria/i);
  });

  it('avisa que campo de texto livre permanece armazenado após a exclusão', () => {
    renderPage();
    const texto = documentText();

    // A parte mais desconfortável e a que mais importa: a mensagem da
    // candidatura, escrita pela própria creator, hoje não é limpa.
    expect(texto).toMatch(/campos de texto livre/i);
    expect(texto).toMatch(/permanece armazenada nesses registros após a exclusão/i);
  });

  it('lista o que a exclusão de fato remove', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/que são apagadas/i); // cópias de imagem
    expect(texto).toMatch(/substituído por um valor sem correspondência/i); // e-mail
    expect(texto).toMatch(/valor aleatório e descartado/i); // senha
    expect(texto).toMatch(/perfil público, que é desligada/i);
  });

  it('diz que a conta de marca ainda não tem exclusão pela plataforma', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/ainda não possui/i);
  });

  it('não promete prazo de retenção nem expiração automática', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não possui, atualmente, mecanismo de expiração/i);
    expect(texto).toMatch(/não estabelece prazos fixos de retenção/i);
    // Nenhum prazo numérico prometido: não existe nada que o cumpra.
    expect(texto).not.toMatch(/no prazo de \d+ (dias|meses|anos)/i);
    expect(texto).not.toMatch(/serão (excluídos|eliminados) (em|após) \d+/i);
  });

  // ─── Direitos, idade e segurança ────────────────────────────────────────────

  it('separa o que se resolve na plataforma do que precisa de e-mail', () => {
    renderPage();
    const texto = documentText();

    expect(screen.getAllByText(/Exportar meus dados/).length).toBeGreaterThan(0);
    expect(texto).toMatch(/Excluir a conta/i);
    expect(texto).toMatch(/exclusão de conta de marca, enquanto não houver funcionalidade/i);
    expect(texto).toMatch(/ANPD/);
  });

  it('diz que a idade é declarada, não verificada', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não solicita data de nascimento/i);
    expect(texto).toMatch(/não realiza verificação documental, biométrica ou automatizada/i);
    expect(texto).toMatch(/declaração do próprio usuário/i);
  });

  it('descreve segurança sem prometer segurança absoluta', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/bcrypt/i);
    expect(texto).toMatch(/HTTPS/);
    expect(texto).toMatch(/não podemos garantir segurança absoluta/i);
    expect(texto).not.toMatch(/totalmente seguro/i);
  });

  it('diz que não há gravação de sessão nem analytics', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não utiliza gravação de sessão/i);
    expect(texto).toMatch(/session replay/i);
    expect(texto).toMatch(/não utiliza cookies de publicidade/i);
  });

  it('confirma a única região de infraestrutura que dá para afirmar', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/União Europeia/);
    expect(texto).toMatch(/não indicamos aqui um país específico que não possamos confirmar/i);
  });

  // ─── Navegação e campos a preencher ─────────────────────────────────────────

  it('mostra o contato de LGPD como link de e-mail', () => {
    renderPage();

    const links = screen.getAllByRole('link', { name: /pedrossgarcia88@gmail\.com/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) =>
      expect(link).toHaveAttribute('href', 'mailto:pedrossgarcia88@gmail.com'),
    );
  });

  it('linka os Termos de Uso', () => {
    renderPage();

    const links = screen.getAllByRole('link', { name: /termos de uso/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', TERMS_PATH));
  });

  it('logo do cabeçalho leva para a landing', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /tayro/i })).toHaveAttribute('href', '/');
  });

  it('identifica o controlador por nome e CPF, sem expor endereço (omissão deliberada)', () => {
    renderPage();

    expect(screen.getByText(/Pedro Soares de Souza Garcia/i)).toBeInTheDocument();
    expect(screen.getByText(/119\.407\.186-43/)).toBeInTheDocument();
    expect(screen.queryByText(/\[ENDEREÇO/i)).not.toBeInTheDocument();
  });
});

// ─── Versão em inglês ─────────────────────────────────────────────────────────
// Tradução publicada em 2026-09-09 sob a MESMA versão do documento. As
// asserções abaixo repetem as de honestidade da versão em português: são elas
// que impedem uma negativa incômoda de sumir só de um lado numa revisão de
// redação, que é o risco real de manter dois textos.
describe('PrivacyPolicyPage · em inglês', () => {
  beforeEach(() => changeLocale('en'));
  afterEach(() => changeLocale('pt'));

  it('é a mesma versão do documento, e diz que a versão em português prevalece', () => {
    renderPage();
    const texto = documentText();

    expect(screen.getByText(new RegExp(`Version ${PRIVACY_VERSION}`))).toBeInTheDocument();
    expect(texto).toMatch(/courtesy translation of the Portuguese original/i);
    expect(texto).toMatch(/the Portuguese version prevails/i);
  });

  it('tem as mesmas 19 seções numeradas', () => {
    renderPage();

    const secoes = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
    expect(secoes).toHaveLength(19);
    expect(secoes[0]).toMatch(/^1\. Who we are and who the controller is$/);
    expect(secoes[18]).toMatch(/^19\. Contact$/);
  });

  it('o seletor de idioma troca o documento inteiro', async () => {
    const user = userEvent.setup();
    changeLocale('pt');
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /english/i }));

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
  });

  it('descreve as métricas de Instagram como estimativa própria, não dado oficial', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/not official Instagram data/i);
    expect(texto).toMatch(/engagement rate estimate/i);
    expect(texto).toMatch(/not an official metric/i);
    expect(texto).toMatch(/copies of the images themselves/i);
  });

  it('diz que as imagens são buscadas pelo nosso servidor, não pelo navegador', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/by our servers/i);
    expect(texto).toMatch(/does not connect to the Instagram content delivery network/i);
  });

  it('não promete de forma absoluta que não há dado sensível', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/does not deliberately request sensitive personal data/i);
    expect(texto).toMatch(/free text fields/i);
    expect(texto).not.toMatch(/does not collect.{0,40}sensitive personal data/i);
  });

  it('lista os mesmos terceiros, e nenhum que não esteja em uso', () => {
    renderPage();
    const texto = documentText();

    ['Neon', 'Railway', 'Vercel', 'Resend', 'Sentry', 'RapidAPI', 'GitHub'].forEach((fornecedor) =>
      expect(texto).toContain(fornecedor),
    );
    expect(texto).not.toMatch(/Cloudflare/i);
    expect(texto).not.toMatch(/Google Analytics/i);
    expect(texto).not.toMatch(/Google Fonts/i);
    expect(texto).not.toMatch(/Stripe|Mercado Pago|PagSeguro|Asaas/i);
    expect(texto).toMatch(/served from the TAYRO domain itself/i);
  });

  it('diz que o e-mail das partes não é entregue à contraparte', () => {
    renderPage();

    expect(documentText()).toMatch(/not made available to the counterparty/i);
  });

  it('descreve o perfil público como desativado por padrão, com o telefone junto', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/starts switched off/i);
    expect(texto).toMatch(/phone number is published together/i);
    expect(texto).toMatch(/no separate option to publish the profile without the phone number/i);
    expect(texto).toMatch(/email address is never shown/i);
  });

  it('não promete exclusão total, e avisa que texto livre permanece', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/is not the complete removal of every record/i);
    expect(texto).toMatch(/free text fields/i);
    expect(texto).toMatch(/stays stored in those records after the account is deleted/i);
    expect(texto).toMatch(/does not yet have/i);
  });

  it('não promete prazo de retenção nem expiração automática', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/no mechanism for expiring or automatically deleting any data/i);
    expect(texto).toMatch(/does not set fixed retention periods/i);
    expect(texto).not.toMatch(/within \d+ (days|months|years)/i);
  });

  it('diz que a idade é declarada, não verificada, e não promete segurança absoluta', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/does not ask for a date of birth/i);
    expect(texto).toMatch(/no documentary, biometric or automated age verification/i);
    expect(texto).toMatch(/cannot guarantee absolute security/i);
    expect(texto).not.toMatch(/completely secure\./i);
  });

  it('diz que não há gravação de sessão nem analytics', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/does not use session replay/i);
    expect(texto).toMatch(/does not use advertising cookies/i);
  });

  it('mantém a identificação do controlador e não expõe endereço', () => {
    renderPage();

    expect(screen.getByText(/Pedro Soares de Souza Garcia/i)).toBeInTheDocument();
    expect(screen.getByText(/119\.407\.186-43/)).toBeInTheDocument();
    expect(screen.queryByText(/\[ENDERE/i)).not.toBeInTheDocument();
  });

  it('linka os Termos de Uso pelo mesmo endereço', () => {
    renderPage();

    const links = screen.getAllByRole('link', { name: /terms of use/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', TERMS_PATH));
  });
});
