import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { resolveContactConfig } from '../../config/contact';
import { cn } from '../../lib/utils';
import KineticActions, {
  type KineticAction,
} from '../../components/primitives/kinetic/KineticActions';
import SectionLabel from './landing/SectionLabel';
import StepVisual from './landing/StepVisual';
import DemoProduto from './landing/DemoProduto';
import DoisLados from './landing/DoisLados';
import HeaderAccountMenu from './landing/HeaderAccountMenu';
import { CandidaturaPainel } from './landing/CandidaturaPlate';
import { HERO_CREATOR } from './landing/demo';
import WhatsAppIcon from './landing/WhatsAppIcon';

// ─── Landing / porta de entrada ──────────────────────────────────────────────
// `/` não é redirect pro login: quem digita o domínio chega numa página que
// explica o produto. Standalone, sem layout compartilhado — igual a
// PublicApplyPage / PublicCreatorProfilePage / BrowseProgramsPublicPage.
//
// Objetivo único (fase pré-validação, ver .claude/knowledge/roadmap.md): abrir
// conversa com marca. CTA principal = WhatsApp, sem formulário e sem backend.
// Sem VITE_CONTACT_WHATSAPP (dev/CI/preview) o CTA cai pra /register/brand —
// botão morto é pior que botão ausente.
//
// A copy é checada contra os "nunca" do vision.md: nada de métrica fabricada,
// prova social, "histórico verificado" como feature pronta, ou discovery de
// creator. Só os diferenciais que existem em produção sustentam a página.
//
// Direção visual: redesign editorial de 2026-08-29 (spec do Stitch em
// `stitch_tayro_visual_redesign_spec/`), dentro da gramática Kinetic que o
// produto já usa. Grid assimétrico de 12 colunas, índice técnico por seção e
// escala de display maior. Os componentes ficam em `./landing/` e são LOCAIS:
// esta é uma mudança de landing, não uma migração das outras telas, então
// nenhum primitivo compartilhado foi alterado — só consumido.
//
// Acessibilidade: cada seção é um landmark nomeado (`aria-labelledby`) e o
// rótulo mono da seção É o <h2> — o leitor de tela navega a página inteira
// pelo outline de títulos, não só pelo <h1>. Link "pular pro conteúdo", foco
// visível em lime e toda animação atrás de `motion-safe`.

const PROBLEMAS = [
  {
    kicker: 'a entrada',
    text: 'A candidatura chega por DM e por formulário, e se perde no meio das outras.',
  },
  {
    kicker: 'a avaliação',
    text: 'Pra decidir, você abre o Instagram de cada uma na mão, uma tarde inteira.',
  },
  {
    kicker: 'o controle',
    text: 'O resto vira planilha e WhatsApp, e no fim do mês ninguém sabe o que funcionou.',
  },
];

const PASSOS = [
  {
    text: 'Publique a campanha com a oferta já definida: valor, tipo e prazo. Todo mundo vê o mesmo antes de se candidatar.',
  },
  {
    text: 'Divulgue o link. A creator se candidata sem precisar criar conta antes. A conta nasce depois.',
  },
  {
    text: 'Decida com o Instagram real dela do lado do botão: seguidores, engajamento calculado e os últimos posts, atualizados sozinhos.',
  },
];

// Foco visível consistente pros links de texto da página. Sem isto, o teclado
// só tem o outline do browser sobre o fundo escuro — inconsistente e fraco.
const linkFocus =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Faixa horizontal padrão: 12 colunas dentro da margem editorial de 48px. */
const shell = 'mx-auto w-full max-w-[1800px] px-5 sm:px-8 lg:px-12';

export default function LandingPage() {
  const { accessToken, user } = useAuthStore();

  if (accessToken && user?.role === 'BRAND') {
    return <Navigate to="/brand/dashboard" replace />;
  }
  if (accessToken && user?.role === 'INFLUENCER') {
    return <Navigate to="/influencer/dashboard" replace />;
  }

  const { whatsappUrl } = resolveContactConfig(import.meta.env);

  // CTA principal: WhatsApp quando há número configurado, senão cadastro de
  // marca. Nunca um link morto.
  // O ícone só entra quando o destino É o WhatsApp. No fallback pra
  // /register/brand ele mentiria sobre onde o clique leva.
  const conversar: KineticAction = whatsappUrl
    ? { label: 'Quero conversar', href: whatsappUrl, primary: true, icon: <WhatsAppIcon /> }
    : { label: 'Quero conversar', to: '/register/brand', primary: true };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Sempre no DOM e focável; sai da tela por transform (não por `sr-only`,
          cujo reset de padding esmaga o px/py) e volta no foco do teclado. */}
      <a
        href="#conteudo"
        className="absolute left-4 top-3 z-[60] -translate-y-20 bg-lime px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-widest text-black focus:translate-y-0 focus-visible:outline-none"
      >
        Pular para o conteúdo
      </a>

      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className={cn(shell, 'flex h-16 items-center justify-between sm:h-20')}>
          <span className="font-display text-[19px] font-bold tracking-[-.05em]">
            tay<span className="text-lime">ro</span>
          </span>
          <HeaderAccountMenu />
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="pt-16 focus:outline-none sm:pt-20">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-title"
          className="relative overflow-hidden border-b border-white/10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_0%,rgba(198,255,51,0.07),transparent_60%)]"
          />
          <div
            className={cn(
              shell,
              'grid grid-cols-1 items-center gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-8 lg:py-28',
            )}
          >
            {/* Copy — 7 colunas */}
            <div className="lg:col-span-7">
              <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-lime/80">
                <span aria-hidden="true" className="h-2 w-2 bg-lime" />
                CRM para marcas
              </p>

              <h1
                id="hero-title"
                className="mt-6 max-w-[15ch] text-balance font-display text-[40px] font-bold leading-[0.95] tracking-[-.045em] sm:text-6xl lg:text-7xl xl:text-[84px]"
              >
                Decidir com quem trabalhar deve levar minutos,{' '}
                <span className="block text-kinetic-muted">não uma tarde no Instagram.</span>
              </h1>

              <p className="mt-8 max-w-[58ch] border-l border-white/10 py-1 pl-6 text-pretty text-base leading-relaxed text-kinetic-text sm:text-lg">
                {/* A marca escrita como a logo: "RO" em lime. Fica só nesta
                    menção do herói — repetir em todo TAYRO da página gastaria o
                    orçamento de lime e viraria ruído. O texto no DOM continua
                    sendo "TAYRO", então busca por texto não muda. */}
                O <span className="font-semibold">TAY<span className="text-lime">RO</span></span> é o
                CRM pra marca que já recebe candidatura de creator e decide na mão. Cada candidatura
                chega com o Instagram real da creator do lado do botão de aprovar.
              </p>

              <div className="mt-10 max-w-xl">
                {/* Em 360px "Ver campanhas abertas" (mono, caixa alta, tracking
                    largo) não cabe em meia barra: quebrava em duas linhas
                    coladas no bloco lime. Empilha no celular e volta a ficar
                    lado a lado a partir de sm. O divisor acompanha — vira
                    borda de topo enquanto está empilhado. Estilo aplicado por
                    className, sem tocar no primitivo compartilhado. */}
                <KineticActions
                  dark
                  className="flex-col sm:flex-row [&>*+*]:border-l-0 [&>*+*]:border-t sm:[&>*+*]:border-l sm:[&>*+*]:border-t-0"
                  actions={[conversar, { label: 'Ver campanhas abertas', to: '/programs' }]}
                />
              </div>
            </div>

            {/* Painel — 5 colunas. Escondido abaixo de lg: a mesma peça aparece
                em tamanho real na demonstração, e repetir encareceria o topo do
                celular sem acrescentar argumento. */}
            <div className="relative hidden lg:col-span-5 lg:block">
              <div
                aria-hidden="true"
                className="absolute -right-6 -top-6 -z-10 h-56 w-56 border border-white/5 bg-background"
              />
              <div className="transition-transform duration-700 ease-tayro motion-safe:[transform:perspective(1400px)_rotateY(-5deg)] motion-safe:hover:[transform:perspective(1400px)_rotateY(0deg)]">
                <CandidaturaPainel creator={HERO_CREATOR} />
              </div>
              {/* A pessoa que olha esta placa precisa saber que o rosto e os
                  números não são de ninguém. Custa uma linha e evita que a
                  demonstração passe por caso real. */}
              <p className="mt-4 text-right font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
                Creator fictícia · imagem gerada
              </p>
            </div>
          </div>
        </section>

        {/* ── 01 · O problema ─────────────────────────────────────────────── */}
        <section aria-labelledby="sec-problema" className="border-b border-white/5 bg-kinetic-dark/40">
          <div className={cn(shell, 'grid grid-cols-1 gap-10 py-20 md:grid-cols-12 sm:py-28')}>
            <div className="md:col-span-3">
              <SectionLabel id="sec-problema" className="md:sticky md:top-28">
                o problema
              </SectionLabel> 
            </div>

            <ul className="md:col-span-9 md:border-l md:border-white/10">
              {PROBLEMAS.map((p, i) => (
                <li
                  key={p.kicker}
                  className={cn(
                    'group grid grid-cols-1 gap-3 py-8 transition-colors lg:grid-cols-12 lg:gap-6 lg:py-10 md:pl-8 lg:pl-14',
                    i < PROBLEMAS.length - 1 && 'border-b border-white/5',
                  )}
                >
                  <h3 className="font-display text-2xl lowercase tracking-[-.03em] text-foreground sm:text-3xl lg:col-span-4">
                    {p.kicker}
                  </h3>
                  <p className="text-pretty text-base leading-relaxed text-kinetic-text sm:text-lg lg:col-span-8">
                    {p.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 02 · Como funciona ──────────────────────────────────────────── */}
        <section aria-labelledby="sec-como" className="border-b border-white/5">
          <div className={cn(shell, 'py-20 sm:py-28')}>
            <SectionLabel id="sec-como" align="center" className="mb-14">
              como funciona
            </SectionLabel>

            <ol className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
              {PASSOS.map((s, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex flex-col gap-5',
                    // Escalonamento editorial: cada passo desce um degrau.
                    i === 1 && 'lg:mt-12',
                    i === 2 && 'lg:mt-24',
                  )}
                >
                  <StepVisual step={(i + 1) as 1 | 2 | 3} />
                  <div>
                    <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-lime">
                      passo {String(i + 1).padStart(2, '0')}
                    </p>
                    <p className="mt-3 border-l border-white/10 pl-4 text-pretty text-base leading-relaxed text-kinetic-text">
                      {s.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 03 · O produto (demonstração) ───────────────────────────────── */}
        <section aria-labelledby="sec-produto" className="border-b border-white/5 bg-kinetic-dark/40">
          <div className={cn(shell, 'py-20 sm:py-28')}>
            <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionLabel id="sec-produto">
                a parceria dentro do produto
              </SectionLabel>
              <p className="max-w-[52ch] text-pretty text-base leading-relaxed text-kinetic-text">
                Da candidatura à entrega, nas mesmas abas que a marca usa. Aprove uma candidatura e
                acompanhe a parceria virar recompensa registrada e conteúdo em revisão.
              </p>
            </div>

            <DemoProduto />
          </div>
        </section>

        {/* ── Os dois lados ───────────────────────────────────────────────── */}
        <section aria-labelledby="sec-lados" className="border-b border-white/5">
          <div className={cn(shell, 'py-20 sm:py-28')}>
            <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionLabel id="sec-lados">os dois lados da parceria</SectionLabel>
              <p className="max-w-[52ch] text-pretty text-base leading-relaxed text-kinetic-text">
                A marca cria a oportunidade e a creator encontra. Cada uma vê a sua parte da mesma
                campanha, do primeiro anúncio até o conteúdo entregue.
              </p>
            </div>

            <DoisLados />
          </div>
        </section>

        {/* ── CTA final ───────────────────────────────────────────────────── */}
        <section aria-labelledby="sec-cta">
          <div className={cn(shell, 'py-20 sm:py-28')}>
            <div className="relative overflow-hidden border border-white/10 bg-kinetic-dark">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="flex flex-col justify-center border-b border-white/10 p-8 sm:p-12 md:border-b-0 md:border-r lg:p-16">
                  <h2
                    id="sec-cta"
                    className="text-balance font-display text-3xl font-bold leading-tight tracking-[-.03em] text-foreground sm:text-4xl lg:text-[46px]"
                  >
                    Quer ver se resolve o seu caso?
                  </h2>
                  <p className="mt-6 max-w-[46ch] text-pretty text-base leading-relaxed text-kinetic-text sm:text-lg">
                    Conta como você trabalha com creators hoje. Se o TAYRO encaixar, a gente te
                    mostra rodando, sem apresentação de vendas.
                  </p>
                  <div className="mt-10 max-w-sm">
                    <KineticActions dark actions={[conversar]} />
                  </div>
                </div>

                {/* Placa gráfica: geometria, não fotografia. */}
                <div
                  aria-hidden="true"
                  className="relative hidden items-center justify-center bg-kinetic-black/40 p-12 md:flex"
                >
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="w-full max-w-[280px] text-lime/25 motion-safe:animate-[spin_40s_linear_infinite]"
                  >
                    <circle cx="50" cy="50" r="40" strokeDasharray="2 4" />
                    <circle cx="50" cy="50" r="30" strokeDasharray="1 6" />
                    <circle cx="50" cy="50" r="20" strokeWidth="1" />
                    <path d="M50 10 L50 90 M10 50 L90 50" />
                    <path d="M22 22 L78 78 M22 78 L78 22" strokeWidth="0.2" />
                    <polygon
                      points="50,15 75,40 65,80 35,70 20,40"
                      fill="currentColor"
                      fillOpacity="0.12"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-kinetic-black">
        <div className={cn(shell, 'flex flex-col gap-8 py-12 sm:py-14')}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-display text-[17px] font-bold tracking-[-.05em]">
              tay<span className="text-lime">ro</span>
            </span>
            <nav
              aria-label="Rodapé"
              className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted"
            >
              <Link to="/login" className={cn('transition-colors hover:text-lime', linkFocus)}>
                Entrar
              </Link>
              <Link
                to="/register/brand"
                className={cn('transition-colors hover:text-lime', linkFocus)}
              >
                Criar conta de marca
              </Link>
              <Link to="/programs" className={cn('transition-colors hover:text-lime', linkFocus)}>
                Campanhas abertas
              </Link>
            </nav>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
            © {new Date().getFullYear()} TAYRO. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
