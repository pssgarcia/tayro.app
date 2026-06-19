import { Link } from 'react-router-dom';
import { Building2, Sparkles, ArrowRight } from 'lucide-react';

export default function RegisterChooserPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Logo */}
      <div className="flex justify-center">
        <span className="font-display text-3xl font-bold tracking-tight">
          tay<span className="text-lime">ro</span>
        </span>
      </div>

      {/* Headline */}
      <div className="space-y-1 text-center">
        <h1 className="font-display text-[32px] font-bold leading-tight text-foreground">
          Como você quer começar?
        </h1>
        <p className="text-sm text-muted-foreground">
          Escolha o tipo de conta para criar.
        </p>
      </div>

      {/* Opções */}
      <div className="space-y-3">
        <Link
          to="/register/influencer"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-lime/30 hover:bg-card/80"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime/10 text-lime">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-foreground">
              Sou creator
            </p>
            <p className="text-xs text-muted-foreground">
              Encontre programas e feche parcerias com marcas.
            </p>
          </div>
          <ArrowRight
            size={16}
            className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>

        <Link
          to="/register/brand"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-lime/30 hover:bg-card/80"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            <Building2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-foreground">
              Sou marca
            </p>
            <p className="text-xs text-muted-foreground">
              Crie programas e receba candidaturas de creators.
            </p>
          </div>
          <ArrowRight
            size={16}
            className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Link de login */}
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:text-lime hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
