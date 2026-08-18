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

        // "Kinetic Editorial" — nova direção visual (aprovada 2026-08-16,
        // telas de revisão de candidato), promovida a token porque virou a
        // identidade padrão do projeto daqui pra frente. `lime` acima É o
        // "kinetic-accent" do mock original — mesmo hex, sem duplicar token.
        // Convive com `plate`/`signal` (redesign 2a) enquanto o resto do
        // produto ainda não foi migrado — não remover os antigos até migrar.
        kinetic: {
          black: '#121212', // fundo
          dark: '#1a1a1a', // superfície elevada (hover, skeleton, sheet)
          gray: '#2a2a2a', // borda / placeholder de imagem
          light: '#e5e5e0', // "placa" clara do Kinetic — equivalente ao plate.DEFAULT
          text: '#d1d1d1', // texto secundário forte
          muted: '#888888', // legenda / rótulo mono
          border: '#3a3a3a', // borda de controle sobre superfície escura (mais clara que `gray`, que é base/placeholder)
        },

        // "Placa transparente": o objeto claro que ancora toda tela (redesign
        // 2a). É o único elemento claro do app — usar UMA por tela.
        plate: {
          DEFAULT: '#E8E8E3', // fundo da placa
          ink: '#0E0E0E', // números e texto forte sobre a placa
          body: '#242420', // texto corrido sobre a placa
          muted: '#6A6A64', // secundário sobre a placa
          soft: '#7A7A74', // legenda de número sobre a placa
          dim: '#5C5C56', // frase de apoio sob o número herói
          fill: '#D4D4CD', // placeholder de imagem (avatar, grade IG)
          line: 'rgba(14,14,14,.12)', // divisor sobre a placa
          mark: 'rgba(10,10,10,.26)', // crop marks
        },

        // Status. Fundo sólido — não usar /10 + borda /20.
        signal: {
          wait: '#F5A524', // "Análise" / "Aguardando"
          dot: '#D08A00', // bolinha de aguardando sobre a placa
          done: '#C6FF33', // "Fechada" / "Aprovada"
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

      // Escala de display do redesign 2a: line-height e tracking vêm colados
      // no tamanho, porque número grande com leading default quebra o ritmo.
      fontSize: {
        'd-hero': ['88px', { lineHeight: '.76', letterSpacing: '-.075em', fontWeight: '700' }],
        'd-xl': ['46px', { lineHeight: '.76', letterSpacing: '-.07em', fontWeight: '700' }],
        'd-lg': ['40px', { lineHeight: '.8', letterSpacing: '-.065em', fontWeight: '700' }],
        'd-md': ['30px', { lineHeight: '1', letterSpacing: '-.05em', fontWeight: '700' }],
        'd-sm': ['24px', { lineHeight: '1.1', letterSpacing: '-.05em', fontWeight: '700' }],
        'd-inline': ['28px', { lineHeight: '1', letterSpacing: '-.055em', fontWeight: '700' }],
        'd-xs': ['15px', { lineHeight: '1.3', letterSpacing: '-.025em', fontWeight: '700' }],
      },

      boxShadow: {
        plate: '0 22px 48px -22px rgba(0,0,0,.95)',
        'plate-lg': '0 24px 50px -22px rgba(0,0,0,.95)',
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
