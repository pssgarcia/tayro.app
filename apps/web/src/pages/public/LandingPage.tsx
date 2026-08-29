import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { resolveContactConfig } from '../../config/contact';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions, {
  type KineticAction,
} from '../../components/primitives/kinetic/KineticActions';

// ─── Landing / porta de entrada ──────────────────────────────────────────────
// `/` deixa de ser um redirect pro login: quem digita o domínio agora chega
// numa página que explica o produto. Standalone, sem layout compartilhado —
// igual a PublicApplyPage / PublicCreatorProfilePage / BrowseProgramsPublicPage.
//
// Objetivo único (fase pré-validação, ver .claude/knowledge/roadmap.md): abrir
// conversa com marca. CTA principal = WhatsApp, sem formulário e sem backend.
// Sem VITE_CONTACT_WHATSAPP (dev/CI/preview) o CTA cai pra /register/brand —
// botão morto é pior que botão ausente.
//
// A copy é checada contra os "nunca" do vision.md: nada de métrica fabricada,
// prova social, "histórico verificado" como feature pronta, ou discovery de
// creator. Só os diferenciais que existem em produção sustentam a página.

const PROBLEMAS = [
  {
    kicker: 'a entrada',
    text: 'A candidatura chega por DM e por formulário, e se perde no meio das outras.',
  },
  {
    kicker: 'a avaliação',
    text: 'Pra decidir, você abre o Instagram de cada uma na mão — uma tarde inteira.',
  },
  {
    kicker: 'o controle',
    text: 'O resto vira planilha e WhatsApp, e no fim do mês ninguém sabe o que funcionou.',
  },
];

const PASSOS = [
  {
    text: 'Publique o programa com a oferta já definida: valor, tipo e prazo. Todo mundo vê o mesmo antes de se candidatar.',
  },
  {
    text: 'Divulgue o link. A creator se candidata sem precisar criar conta antes — a conta nasce depois.',
  },
  {
    text: 'Decida com o Instagram real dela do lado do botão: seguidores, engajamento calculado e os últimos posts, atualizados sozinhos.',
  },
];

const NAO_E = [
  'Não serve pra ir atrás de creator que não veio — serve pra decidir sobre quem já se candidatou.',
  'Não é agência: a gente não roda a campanha, não cobra comissão e não opina em quem você deve chamar.',
  'Nunca cobra da creator. Perfil e candidatura são sempre de graça pra ela.',
];

function Kicker({ children }: { children: string }) {
  return (
    <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
      {children}
    </p>
  );
}

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
  const conversar: KineticAction = whatsappUrl
    ? { label: 'Quero conversar', href: whatsappUrl, primary: true }
    : { label: 'Quero conversar', to: '/register/brand', primary: true };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-[60px] max-w-5xl items-center justify-between px-4 sm:px-6">
        <span className="font-display text-[19px] font-bold tracking-[-.05em]">
          tay<span className="text-lime">ro</span>
        </span>
        <Link
          to="/login"
          className="font-mono text-[11px] uppercase tracking-widest text-kinetic-text transition-colors hover:text-foreground"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="pt-12 sm:pt-20">
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.02] tracking-[-.04em] sm:text-6xl lg:text-7xl">
            Decidir com quem trabalhar deve levar minutos, não uma tarde no Instagram.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-kinetic-text sm:text-lg">
            O TAYRO é o CRM pra marca que já recebe candidatura de creator e decide na mão. Cada
            candidatura chega com o Instagram real da creator do lado do botão de aprovar.
          </p>
          <div className="mt-10 max-w-xl">
            <KineticActions dark actions={[conversar, { label: 'Ver programas abertos', to: '/programs' }]} />
          </div>
        </section>

        {/* ── O problema ──────────────────────────────────────────────────── */}
        <section className="mt-24 sm:mt-32">
          <Kicker>o problema</Kicker>
          <div className="grid gap-8 sm:grid-cols-3">
            {PROBLEMAS.map((p) => (
              <div key={p.kicker}>
                <p className="font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
                  {p.kicker}
                </p>
                <p className="mt-2 text-base leading-relaxed text-kinetic-text">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Como funciona ───────────────────────────────────────────────── */}
        <section className="mt-24 sm:mt-32">
          <Kicker>como funciona</Kicker>
          <ol className="grid gap-8 sm:grid-cols-3">
            {PASSOS.map((s, i) => (
              <li key={i}>
                <p className="font-display text-3xl font-bold tracking-[-.05em] tabular-nums text-foreground">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-2 text-base leading-relaxed text-kinetic-text">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── A placa (única da tela) ─────────────────────────────────────── */}
        <section className="mt-24 sm:mt-32">
          <KineticPlate flush marks="top" className="mx-auto max-w-xl">
            <div className="px-8 pb-8 pt-10">
              <h2 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
                Quer ver se resolve o seu caso?
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                Conta como você trabalha com creators hoje. Se o TAYRO encaixar, a gente te mostra
                rodando — sem apresentação de vendas.
              </p>
            </div>
            <KineticActions actions={[conversar]} />
          </KineticPlate>
        </section>

        {/* ── O que o TAYRO não é ─────────────────────────────────────────── */}
        <section className="mt-24 sm:mt-32">
          <Kicker>o que o tayro não é</Kicker>
          <ul className="space-y-4">
            {NAO_E.map((line) => (
              <li key={line} className="max-w-2xl text-lg leading-relaxed text-kinetic-text">
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Faixa pra creator ──────────────────────────────────────────── */}
        <section className="mt-24 sm:mt-32">
          <Kicker>pra creator</Kicker>
          <p className="max-w-2xl text-lg leading-relaxed text-kinetic-text">
            Sempre de graça. Você vê o valor, o tipo e o prazo antes de se candidatar, e se
            candidata pelo link sem criar conta.
          </p>
          <Link
            to="/programs"
            className="mt-5 inline-block font-mono text-[11px] uppercase tracking-widest text-lime transition-opacity hover:opacity-80"
          >
            Ver programas abertos →
          </Link>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl border-t border-kinetic-border px-4 py-10 sm:px-6">
        <span className="font-display text-[17px] font-bold tracking-[-.05em]">
          tay<span className="text-lime">ro</span>
        </span>
        <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
          <Link to="/login" className="transition-colors hover:text-foreground">
            Entrar
          </Link>
          <Link to="/register/brand" className="transition-colors hover:text-foreground">
            Criar conta de marca
          </Link>
          <Link to="/programs" className="transition-colors hover:text-foreground">
            Programas abertos
          </Link>
        </nav>
      </footer>
    </div>
  );
}
