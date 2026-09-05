import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TermsOfUsePage from './TermsOfUsePage';
import { PRIVACY_PATH, TERMS_VERSION } from '../../config/legal';

function renderPage() {
  return render(<TermsOfUsePage />, { wrapper: MemoryRouter });
}

/** Texto corrido da página, para as asserções de conteúdo do documento. */
function documentText() {
  return document.body.textContent ?? '';
}

describe('TermsOfUsePage', () => {
  it('tem o título e a versão do documento', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument();
    // A versão precisa aparecer: é ela que dá sentido ao `acceptedTermsVersion`
    // gravado no banco quando alguém marca a caixa de aceite.
    expect(screen.getByText(new RegExp(`Versão ${TERMS_VERSION}`))).toBeInTheDocument();
  });

  it('tem as 22 cláusulas numeradas', () => {
    renderPage();

    const clausulas = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
    expect(clausulas).toHaveLength(22);
    expect(clausulas[0]).toMatch(/^1\. Aceitação dos Termos$/);
    expect(clausulas[21]).toMatch(/^22\. Contato$/);
  });

  it('descreve o que o registro de aceite guarda, sem chamar de consentimento genérico', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/versão destes Termos de Uso vigente/i);
    expect(texto).toMatch(/data e a hora do aceite/i);
    expect(texto).toMatch(/18 anos ou mais/);
    // O ponto que o Pedro pediu explicitamente: aceitar o documento não é
    // consentir com todo tratamento de dados.
    expect(texto).toMatch(/não constitui consentimento único e genérico/i);
  });

  // ─── Testes de honestidade ──────────────────────────────────────────────────
  // Mesmo padrão dos testes da landing: o documento tem que DIZER o que o
  // produto não faz. Estas asserções falham no dia em que alguém "melhorar" a
  // redação apagando uma negativa incômoda.

  it('diz que não processa pagamento e que o estado da recompensa não é comprovante', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não processa pagamentos/i);
    expect(texto).toMatch(/gateway de pagamento/i);
    expect(texto).toMatch(/escrow/i);
    expect(texto).toMatch(/não é comprovante/i);
    expect(texto).toMatch(/não emite notas fiscais/i);
  });

  it('diz que não verifica identidade nem titularidade de perfil', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não verifica a identidade/i);
    expect(texto).toMatch(/não confirma se a pessoa que informa um perfil de rede social/i);
    expect(texto).toMatch(/não valida CNPJ/i);
  });

  it('diz que não há integração oficial com Instagram ou Meta', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não possui integração oficial/i);
    expect(texto).toMatch(/provedor externo não oficial/i);
    expect(texto).toMatch(/não é parceiro, afiliado ou autorizado/i);
  });

  it('diz que não modera conteúdo e que não hospeda arquivo', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não realiza moderação prévia/i);
    expect(texto).toMatch(/não hospeda arquivos de conteúdo/i);
    expect(texto).toMatch(/não possui upload de vídeo, foto ou documento/i);
  });

  it('diz que não garante disponibilidade, SLA nem suporte com prazo', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não assume compromisso de disponibilidade contínua/i);
    expect(texto).toMatch(/uptime/i);
    expect(texto).toMatch(/SLA/);
  });

  it('diz que não é parte da relação e lista o que não garante', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não é parte dessa relação/i);
    expect(texto).toMatch(/não garante o pagamento/i);
    expect(texto).toMatch(/não fiscaliza o cumprimento/i);
    expect(texto).toMatch(/não media, arbitra ou resolve conflitos/i);
    expect(texto).toMatch(/nos limites permitidos pela legislação aplicável/i);
  });

  it('diz que a aprovação não é contrato nem aceite formal de oferta', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/não possui assinatura eletrônica/i);
    expect(texto).toMatch(/não constitui, por si, contrato entre marca e creator/i);
  });

  it('explica que a candidatura sem login cria uma conta', () => {
    renderPage();
    const texto = documentText();

    // O comportamento mais fácil de esconder do produto: enviar candidatura
    // pelo link público cria conta. O documento tem que dizer isso.
    expect(texto).toMatch(/envie candidatura sem estar logado/i);
    expect(texto).toMatch(/uma conta de creator é criada com os dados informados/i);
    expect(texto).toMatch(/sem senha definida pelo usuário/i);
    expect(texto).toMatch(/link para que a própria pessoa defina/i);
  });

  it('não trata a simples navegação em página pública como aceite', () => {
    renderPage();
    const texto = documentText();

    // O aceite real acontece em 3 fluxos, todos com caixa marcada à mão.
    // Visitante de /, /programs e /c/:handle nunca vê caixa nenhuma, então
    // dizer que usar a plataforma equivale a aceitar seria descrever um
    // mecanismo que não existe.
    expect(texto).toMatch(/A simples visita a essas páginas não é tratada como aceite/i);
    expect(texto).toMatch(/podem ser consultadas sem cadastro/i);
    expect(texto).toMatch(/Consultar as páginas públicas não exige aceite/i);
    // E o aceite fica amarrado aos dois atos que de fato o exigem.
    expect(texto).toMatch(/exigem o aceite expresso destes Termos/i);
    expect(texto).toMatch(/Sem esse aceite, a conta não é criada/i);
  });

  it('trata a moderação como faculdade limitada, não como mecanismo formal', () => {
    renderPage();
    const texto = documentText();

    // Não existe back-office, sistema de moderação nem canal de denúncia.
    // Prometer remoção "a seu critério" descreveria capacidade operacional
    // inexistente.
    expect(texto).toMatch(/Não há obrigação geral de monitoramento prévio/i);
    expect(texto).toMatch(/nos limites de suas possibilidades técnicas/i);
    expect(texto).toMatch(/Não existe, hoje, canal estruturado de denúncia/i);
    expect(texto).toMatch(/conforme as possibilidades operacionais/i);
  });

  it('não concede licença comercial ampla sobre o conteúdo do usuário', () => {
    renderPage();
    const texto = documentText();

    expect(texto).toMatch(/limitada ao necessário/i);
    expect(texto).toMatch(/não pertence ao TAYRO/i);
    expect(texto).toMatch(/não autoriza o TAYRO a comercializar o conteúdo/i);
  });

  it('não promete garantia de resultado nem de pagamento', () => {
    renderPage();
    const texto = documentText();

    // Proxies de promessa que o sistema não pode cumprir. Se qualquer uma
    // aparecer afirmativamente, é porque a redação mudou de sentido.
    expect(texto).not.toMatch(/garantimos o pagamento/i);
    expect(texto).not.toMatch(/pagamento garantido/i);
    expect(texto).not.toMatch(/perfil verificado pelo TAYRO/i);
    expect(texto).not.toMatch(/identidade verificada/i);
    expect(texto).not.toMatch(/parceria (com|da) (a )?Meta/i);
  });

  // ─── Navegação e campos a preencher ─────────────────────────────────────────

  it('linka a Política de Privacidade', () => {
    renderPage();

    const links = screen.getAllByRole('link', { name: /política de privacidade/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', PRIVACY_PATH));
  });

  it('oferece um canal de contato', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /pedrossgarcia88@gmail.com/i })).toHaveAttribute(
      'href',
      'mailto:pedrossgarcia88@gmail.com',
    );
  });

  it('logo do cabeçalho leva para a landing', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /tayro/i })).toHaveAttribute('href', '/');
  });

  // Estes campos NÃO podem ir para produção como placeholder. Ficam visíveis na
  // página de propósito, e o teste garante que não sejam "resolvidos" apagando
  // o aviso em vez de preenchendo o dado.
  it('mostra os campos que ainda faltam preencher antes de publicar', () => {
    renderPage();

    expect(screen.getByText(/RAZÃO SOCIAL DO RESPONSÁVEL/i)).toBeInTheDocument();
    expect(screen.getByText(/COMARCA \/ FORO/i)).toBeInTheDocument();
  });
});
