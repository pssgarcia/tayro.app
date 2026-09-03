import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import { DEMO_CREATORS, HERO_CREATOR } from './landing/demo';
import { useAuthStore } from '../../stores/auth.store';

function renderAt(entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/brand/dashboard" element={<div>painel da marca</div>} />
        <Route path="/influencer/dashboard" element={<div>painel da creator</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// A Fila tem DUAS superfícies no DOM ao mesmo tempo (lista + placa no desktop,
// Story no celular); quem some é o CSS, que o jsdom não aplica. Escopar pela
// placa evita casar com o botão homônimo do Story — mesmo idioma do
// `CampaignFilaTab.spec` (texto único + `closest('section')`), sem testid.
const placa = () =>
  screen.getByText('mensagem da candidatura').closest('section') as HTMLElement;
const aprovarNaPlaca = () => within(placa()).getByRole('button', { name: /^aprovar$/i });

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('LandingPage', () => {
  it('com VITE_CONTACT_WHATSAPP: o CTA principal aponta pro wa.me com o número', () => {
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '5537999931492');
    renderAt();

    const ctas = screen.getAllByRole('link', { name: /quero conversar/i });
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', expect.stringContaining('https://wa.me/5537999931492'));
    }
  });

  it('sem a env: o CTA principal cai pra /register/brand e não vira link morto', () => {
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '');
    renderAt();

    const ctas = screen.getAllByRole('link', { name: /quero conversar/i });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/register/brand');
      expect(cta.getAttribute('href')).not.toBe('');
      expect(cta.getAttribute('href')).not.toBe('#');
    }
  });

  it('o CTA secundário e o rodapé levam pra /programs', () => {
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '5537999931492');
    renderAt();

    const programLinks = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href') === '/programs');
    // hero (CTA secundário) + rodapé
    expect(programLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('marca logada em / é redirecionada pro painel da marca', () => {
    useAuthStore.setState({
      accessToken: 'tok',
      user: { id: 'b1', email: 'm@x.com', role: 'BRAND' },
      isInitialized: true,
    });
    renderAt();
    expect(screen.getByText('painel da marca')).toBeInTheDocument();
  });

  it('creator logada em / é redirecionada pro painel da creator', () => {
    useAuthStore.setState({
      accessToken: 'tok',
      user: { id: 'i1', email: 'c@x.com', role: 'INFLUENCER' },
      isInitialized: true,
    });
    renderAt();
    expect(screen.getByText('painel da creator')).toBeInTheDocument();
  });

  it('anônima vê a landing', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /decidir com quem trabalhar/i,
    );
  });

  // ── Estrutura acessível (audit → harden) ─────────────────────────────────
  // O risco aqui é um refactor futuro voltar a pôr as seções como <p> mudo: o
  // leitor de tela perde o outline e navega a página inteira só pelo <h1>.
  it('cada seção é um título navegável, não um rótulo mudo', () => {
    renderAt();
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual(
      expect.arrayContaining([
        'o problema',
        'como funciona',
        'os dois lados da parceria',
        'a parceria dentro do produto',
        'Quer ver se resolve o seu caso?',
      ]),
    );
  });

  it('tem link "pular para o conteúdo" apontando pro <main>', () => {
    renderAt();
    const skip = screen.getByRole('link', { name: /pular para o conteúdo/i });
    expect(skip).toHaveAttribute('href', '#conteudo');
    expect(document.querySelector('main#conteudo')).not.toBeNull();
  });

  // ── Honestidade (vision.md / positioning.md) ──────────────────────────────
  // O risco desta página não é bug de render, é dizer o que o produto não é.
  // Trava a regra, não a redação: a landing não pode posicionar como pronto o
  // que não existe em produção (histórico verificado / transparência bilateral)
  // nem prometer discovery de creator.
  it('não posiciona features inexistentes nem discovery de creator', () => {
    renderAt();
    const texto = document.body.textContent ?? '';

    expect(texto).not.toMatch(/verificad/i); // "histórico verificado" — PartnershipResult não é escrito por ninguém
    expect(texto).not.toMatch(/garimp/i); // garimpar influenciador
    expect(texto).not.toMatch(/\bdescubr|\bdescobr/i); // "descubra creators"
    expect(texto).not.toMatch(/transpar[êe]ncia bilateral/i);
  });

  it('sustenta a página nos 4 diferenciais que existem em produção', () => {
    renderAt();
    const texto = (document.body.textContent ?? '').toLowerCase();

    expect(texto).toContain('instagram real'); // media kit vivo
    expect(texto).toContain('oferta já definida'); // oferta antes da candidatura
    expect(texto).toContain('sem precisar criar conta'); // candidatura sem conta prévia
    expect(texto).toContain('histórico'); // histórico + transparência bilateral (2026-09-03)
  });

  // Os números do resultado são DIGITADOS pela marca, nunca medidos pelo
  // tayro (`vision.md` nº5, `positioning.md` nº2). A ressalva mora dentro da
  // aba Resultado (só existe depois de clicar nela), não é promessa de topo.
  it('a aba Resultado diz que o número é informado pela marca, não medido pelo tayro', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: /^resultado$/i }));
    const texto = (document.body.textContent ?? '').toLowerCase();

    expect(texto).toMatch(/informad[ao]s? pel[ao] marca/);
    expect(texto).toMatch(/n[ãa]o mede/);
  });

  // O mock do redesign trazia "ALINHAMENTO DE MARCA — 94%" em destaque no herói.
  // É o mesmo `matchScore` que a Fila calculava com `hash(id)` (removido de lá
  // em 2026-08-31), sem regra pública de cálculo — o `vision.md` nº 5 proíbe.
  // Numa página de marketing seria promessa, não enfeite. Este teste impede
  // que volte por cópia do mock.
  it('não exibe métrica de reputação fabricada', () => {
    renderAt();
    const texto = document.body.textContent ?? '';

    expect(texto).not.toMatch(/alinhamento/i);
    expect(texto).not.toMatch(/\bmatch\b/i);
    expect(texto).not.toMatch(/\bscore\b/i);
    expect(texto).not.toMatch(/\bfit\b/i);
    expect(texto).not.toMatch(/afinidade/i);
  });

  // `vision.md` nº 6: o TAYRO nunca é ferramenta de mega-influencer. Uma
  // demonstração com número de celebridade contradiz o posicionamento na peça
  // mais visível do produto.
  it('a demonstração usa números de micro-creator', () => {
    for (const creator of [HERO_CREATOR, ...DEMO_CREATORS]) {
      expect(creator.followers).toBeGreaterThanOrEqual(8_000);
      expect(creator.followers).toBeLessThanOrEqual(30_000);
    }
  });

  // As pessoas da demonstração não existem e as fotos são geradas. Dizer isso
  // é a mesma régua do vision.md nº 5 aplicada à imagem: a página não pode
  // deixar um rosto inventado passar por caso real.
  it('avisa que creators e imagens são fictícias', () => {
    renderAt();
    const texto = (document.body.textContent ?? '').toLowerCase();

    expect(texto).toContain('fictícia');
    expect(texto).toContain('gerada');
  });

  // ── Os dois lados ─────────────────────────────────────────────────────────
  // A tese do produto (`vision.md`) é que marca e creator são o MESMO produto.
  // A landing nasceu contando só o lado da marca; se esta seção sumir ou virar
  // só o lado da marca de novo, o posicionamento volta a ficar pela metade.
  it('fala com os dois públicos, não só com a marca', () => {
    renderAt();
    const h3 = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

    expect(h3).toEqual(
      expect.arrayContaining([
        'Encontre quem faz sentido.',
        'Encontre oportunidades que fazem sentido pra você.',
      ]),
    );
  });

  it('o ciclo alterna entre os dois lados, em vez de listar features soltas', () => {
    renderAt();

    // Passos de cada lado, na ordem em que a parceria acontece.
    expect(screen.getByText(/publica a campanha com a oferta definida/i)).toBeInTheDocument();
    expect(screen.getByText(/encontra a campanha aberta e vê a oferta/i)).toBeInTheDocument();
    expect(screen.getByText(/se candidata pelo link/i)).toBeInTheDocument();
    expect(screen.getByText(/decide com o instagram da creator do lado/i)).toBeInTheDocument();
    expect(screen.getByText(/envia o conteúdo combinado/i)).toBeInTheDocument();
    expect(screen.getByText(/recebe e revisa o conteúdo/i)).toBeInTheDocument();
    // O ciclo FECHA de volta na creator: ela recebe o resultado, não só a
    // marca recebendo o conteúdo. É a transparência bilateral do
    // `positioning.md` nº3 — sem isto o ciclo conta só metade da história.
    expect(screen.getByText(/informa o resultado da parceria/i)).toBeInTheDocument();
    expect(screen.getByText(/vê o resultado no histórico do seu perfil/i)).toBeInTheDocument();
  });

  // O lado da creator não pode virar promessa de marketing. São os "nunca" do
  // vision.md do lado dela — e o que o Pedro pediu explicitamente pra evitar.
  it('não faz promessa de audiência nem apela pro "de graça"', () => {
    renderAt();
    const texto = document.body.textContent ?? '';

    expect(texto).not.toMatch(/gr[áa]tis|gratuit/i);
    expect(texto).not.toMatch(/monetiz/i);
    expect(texto).not.toMatch(/cres[çc]a/i);
    expect(texto).not.toMatch(/audi[êe]ncia/i);
  });

  // O @ das candidaturas mostra o ícone de link externo — o produto real leva
  // pro Instagram dali — mas NÃO navega: os handles são inventados e cairiam no
  // perfil de alguém real sem relação com o TAYRO.
  it('o @ da demonstração não vira link pro Instagram', () => {
    renderAt();
    const externos = screen
      .getAllByRole('link')
      .filter((l) => (l.getAttribute('href') ?? '').includes('instagram.com'));

    expect(externos).toHaveLength(0);
  });

  // ── Demonstração interativa ───────────────────────────────────────────────
  it('aprovar na demonstração faz a fila andar', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(aprovarNaPlaca());

    // A placa avança sozinha pra próxima que espera decisão.
    expect(screen.getByText(/corrida de rua e maratona amadora/i)).toBeInTheDocument();
  });

  it('a candidatura que já chegou decidida abre em leitura, sem botão de decisão', async () => {
    const user = userEvent.setup();
    renderAt();

    const jaAprovada = DEMO_CREATORS.find((c) => c.status === 'APPROVED')!;
    await user.click(screen.getByRole('button', { name: new RegExp(jaAprovada.nome, 'i') }));

    expect(screen.getByText(/candidatura aprovada/i)).toBeInTheDocument();
    expect(within(placa()).queryByRole('button', { name: /^aprovar$/i })).not.toBeInTheDocument();
  });

  // O ponto da seção é a CONTINUIDADE: aprovar não é o fim, abre a parceria.
  // Se isto quebrar, a landing voltou a mostrar features soltas.
  it('aprovar abre a parceria nas abas de recompensa e conteúdo', async () => {
    const user = userEvent.setup();
    renderAt();

    const primeira = DEMO_CREATORS[0];
    await user.click(aprovarNaPlaca());

    await user.click(screen.getByRole('button', { name: /^recompensas$/i }));
    // A nota, não o valor: "R$ 300,00" também é a oferta do passo 01 do
    // "como funciona", e a busca acharia os dois.
    expect(screen.getByText(primeira.recompensa.nota)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^conteúdos$/i }));
    expect(screen.getByText(new RegExp(primeira.entrega.legenda, 'i'))).toBeInTheDocument();
  });

  // A aba Resultado é o que fecha os diferenciais nº2/nº3: aprovar abre a
  // parceria "a informar", e informar preenche os números de exemplo.
  it('aprovar abre a parceria também na aba Resultado, como "a informar"', async () => {
    const user = userEvent.setup();
    renderAt();

    const primeira = DEMO_CREATORS[0];
    await user.click(aprovarNaPlaca());

    await user.click(screen.getByRole('button', { name: /^resultado$/i }));

    // Escopado pelo botão "Informar resultado" (só existe nesta aba) em vez
    // do nome: o nome da creator também aparece em "os dois lados", que fica
    // sempre no DOM. `ativos` preserva a ordem de DEMO_CREATORS, então o
    // primeiro bloco é o da creator que acabamos de aprovar.
    const bloco = screen
      .getAllByRole('button', { name: /informar resultado/i })[0]
      .closest('li') as HTMLElement;
    expect(within(bloco).getByText(primeira.nome)).toBeInTheDocument();
    expect(within(bloco).getByText(/a informar/i)).toBeInTheDocument();

    await user.click(within(bloco).getByRole('button', { name: /informar resultado/i }));
    expect(within(bloco).getByText(new RegExp(primeira.resultado.nota, 'i'))).toBeInTheDocument();
  });

  it('a recompensa avança pelo mesmo caminho do produto: pendente → emitida → entregue', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(aprovarNaPlaca());
    await user.click(screen.getByRole('button', { name: /^recompensas$/i }));

    await user.click(screen.getByRole('button', { name: /marcar como emitida/i }));
    expect(screen.queryByRole('button', { name: /marcar como emitida/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /confirmar entrega/i }).length).toBeGreaterThan(0);
  });

  // No celular o produto revisa candidatura em Story de tela cheia, não numa
  // lista encolhida. Se esta anatomia sumir, a landing volta a contar a
  // história errada sobre como o TAYRO funciona no telefone.
  it('no celular a fila é o Story, com a anatomia do produto', () => {
    renderAt();

    // Navegação por toque nas laterais e o painel de posts do Story.
    expect(screen.getByRole('button', { name: /próxima candidatura/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /candidatura anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver posts/i })).toBeInTheDocument();

    // O @ da creator aparece no Story, como no produto (o ícone de link
    // externo vive na placa/Story; a navegação de verdade fica fora da
    // demonstração — ver o teste do @ mais acima).
    expect(screen.getAllByText(`@${DEMO_CREATORS[0].handle}`).length).toBeGreaterThan(0);
  });

  // ── Header ────────────────────────────────────────────────────────────────
  it('o ícone de conta abre um menu com Entrar e Criar conta', async () => {
    const user = userEvent.setup();
    renderAt();

    const gatilho = screen.getByRole('button', { name: /conta/i });
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');

    await user.click(gatilho);
    expect(gatilho).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getByRole('menuitem', { name: /entrar/i })).toHaveAttribute('href', '/login');
    // `/register` é o chooser: quem escolhe o papel é a pessoa, não a landing.
    expect(screen.getByRole('menuitem', { name: /criar conta/i })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});
