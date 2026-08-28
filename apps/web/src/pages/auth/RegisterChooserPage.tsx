import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Sparkles } from 'lucide-react';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 4a do handoff atualizado (design/TAYRO - Direções.dc.html#4a). O
// resumo em prosa do README §9 ("a outra opção é uma linha de texto") está
// desatualizado em relação ao mockup — a legenda da própria referência diz
// "dois cards empilhados, mesmo peso · claro vs escuro diferencia sem
// hierarquizar". Valores extraídos pixel a pixel do HTML, não da prosa.
// Barra de ação própria (50px/14px/gap 8px) — mais compacta que o padrão
// de 56px do PlateActionBar usado nas telas de formulário (Login/Cadastro);
// mockup usa uma escala menor pros dois cards de escolha.

export default function RegisterChooserPage() {
  return (
    <div>
      <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="mb-7 font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] text-foreground">
        Como você quer
        <br />
        começar?
      </h1>

      <div className="flex flex-col gap-3.5">
        <KineticPlate marks="top" flush>
          <div className="px-[22px] pb-[22px] pt-[26px]">
            <Sparkles size={20} className="mb-3.5 block text-black" />
            <p className="font-display text-[19px] font-bold tracking-[-.04em] text-black">
              Sou creator
            </p>
            <p className="mt-[9px] text-[13.5px] leading-[1.5] text-[#3a3a34]">
              Encontre programas abertos e feche parcerias com marcas.
            </p>
          </div>
          <Link
            to="/register/influencer"
            className="flex min-h-[56px] items-center justify-center gap-2 bg-black font-mono text-[11px] font-medium uppercase tracking-widest text-[#e5e5e0] transition-colors duration-[140ms] hover:bg-lime hover:text-black"
          >
            Criar conta de creator
            <ArrowRight size={14} />
          </Link>
        </KineticPlate>

        <div className="overflow-hidden rounded-lg border border-kinetic-gray bg-[#141414] shadow-[0_0_40px_-10px_rgba(198,255,51,.14)]">
          <div className="px-[22px] pb-5 pt-[26px]">
            <Briefcase size={20} className="mb-3.5 block text-lime" />
            <p className="font-display text-[19px] font-bold tracking-[-.04em] text-foreground">
              Sou marca
            </p>
            <p className="mt-[9px] text-[13.5px] leading-[1.5] text-kinetic-muted">
              Crie programas e receba candidaturas.
            </p>
          </div>
          <Link
            to="/register/brand"
            className="flex min-h-[50px] items-center justify-center gap-2 border-t border-kinetic-gray font-display text-[14px] font-semibold tracking-[-.02em] text-foreground transition-colors duration-[140ms] hover:bg-[#1C1C1C]"
          >
            Criar conta de marca
            <ArrowRight size={14} className="text-lime" />
          </Link>
        </div>
      </div>

      <p className="mt-[22px] text-[13px] text-kinetic-muted">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
