import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // Hex literal para cor de marca — sem drift de conversão HSL
        lime: '#C6FF33',

        // "Kinetic Editorial" — a identidade do produto. Aprovada em
        // 2026-08-16 nas telas de revisão de candidato e estendida a todas as
        // 31 telas nas levas de 2026-08-28. `lime` acima É o "kinetic-accent"
        // do mock original — mesmo hex, sem duplicar token.
        //
        // Os tokens `plate`/`signal` do redesign 2a foram removidos em
        // 2026-08-28, junto com a escala de display `d-*` e as sombras de
        // placa: nada mais os consumia.
        kinetic: {
          black: '#121212', // fundo
          dark: '#1a1a1a', // superfície elevada (hover, skeleton, sheet)
          gray: '#2a2a2a', // borda / placeholder de imagem
          light: '#e5e5e0', // a "placa" clara — único elemento claro do app
          text: '#d1d1d1', // texto secundário forte
          muted: '#888888', // legenda / rótulo mono
          border: '#3a3a3a', // borda de controle sobre superfície escura (mais clara que `gray`, que é base/placeholder)
        },

        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      boxShadow: {
        'lime-glow': '0 0 24px -6px rgba(198,255,51,.3)',
        'tab-active': 'inset 0 2px 0 #C6FF33', // barra de aba inferior (topo)
        'tab-under': 'inset 0 -2px 0 #C6FF33', // barra de aba de conteúdo (base)
      },

      transitionTimingFunction: {
        tayro: 'cubic-bezier(.2,.9,.25,1)',
      },

      keyframes: {
        'tayro-count': {
          from: { transform: 'translateY(30%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'tayro-sweep': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },

      animation: {
        'tayro-count': 'tayro-count 640ms cubic-bezier(.2,.9,.25,1) both',
        'tayro-sweep': 'tayro-sweep 900ms cubic-bezier(.2,.9,.25,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
