import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Plate from '../../components/primitives/Plate';
import PlateActionBar from '../../components/primitives/PlateActionBar';

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 9 do redesign 2a. Os dois cards iguais viram placa (o caminho
// recomendado — creator, o volume do produto) + uma linha de texto.

export default function RegisterChooserPage() {
  return (
    <div>
      <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="mb-7 font-display text-d-md text-foreground">
        Como você quer
        <br />
        começar?
      </h1>

      <Plate marks="top" flush>
        <div className="px-6 pb-[26px] pt-[30px]">
          <p className="font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
            Sou creator
          </p>
          <p className="mt-2.5 text-[14px] leading-[1.5] text-plate-body">
            Encontre programas abertos e feche parcerias com marcas.
          </p>
        </div>
        <PlateActionBar
          primary={{ label: 'Criar conta de creator', icon: <ArrowRight size={16} /> }}
        />
      </Plate>

      <Link to="/register/brand" className="mt-[30px] flex items-center gap-3.5">
        <span className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold tracking-[-.025em] text-foreground">
            Sou marca
          </p>
          <p className="mt-[5px] text-xs leading-[1.5] text-[#75756E]">
            Crie programas e receba candidaturas.
          </p>
        </span>
        <ChevronRight size={14} className="shrink-0 text-[#4A4A46]" />
      </Link>

      <p className="mt-[30px] text-[13px] text-[#75756E]">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
