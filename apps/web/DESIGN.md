---
name: TAYRO
description: CRM de creators fitness, creator-first — dark quase-preto com uma placa clara por tela
colors:
  background: "#0A0A0A"
  foreground: "#EDEDE8"
  border: "#232323"
  muted-bg: "#1A1A1A"
  muted-foreground: "#7C7C74"
  support-text: "#8A8A85"
  mono-index: "#7C7C74"
  lime: "#C6FF33"
  lime-label-on-highlight: "#9DB562"
  plate: "#E8E8E3"
  plate-ink: "#0E0E0E"
  plate-body: "#242420"
  plate-muted: "#6A6A64"
  plate-soft: "#7A7A74"
  plate-dim: "#5C5C56"
  plate-fill: "#D4D4CD"
  plate-line: "rgba(14,14,14,.12)"
  plate-mark: "rgba(10,10,10,.26)"
  signal-wait: "#F5A524"
  signal-wait-text: "#E86A5E"
  signal-dot: "#D08A00"
  field-placeholder: "#55554F"
  chevron: "#4A4A46"
typography:
  scale:
    d-hero: "88px"
    d-hero-mobile: "72px"
    d-hero-suffix: "38px"
    d-xl: "46px"
    d-xl-suffix: "23px"
    d-lg: "40px"
    d-md: "30px"
    d-inline: "28px"
    d-sm: "24px"
    d-xs: "15px"
    text-plate-title: "21px"
    text-quote: "15px"
    text-support: "14px"
    text-handle: "13px"
    text-caption: "12px"
    text-tabbar: "11px"
    text-mono-label: "10px"
    text-pill: "9px"
  display:
    fontFamily: "'Space Grotesk', system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "9px"
    letterSpacing: ".1em"
    textTransform: "uppercase"
rounded:
  sm: "3px"
  md: "4px"
  lg: "8px"
spacing:
  screen-x: "24px"
  section-gap: "32px"
  list-item-gap: "22px"
components:
  plate:
    backgroundColor: "{colors.plate}"
    rounded: "{rounded.lg}"
  button-primary:
    backgroundColor: "{colors.plate-ink}"
    textColor: "{colors.foreground}"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.plate-ink}"
  status-pill-pending:
    backgroundColor: "{colors.signal-wait}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
  status-pill-approved:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
---

# Design System: TAYRO

## Overview

**Creative North Star: "O Cronômetro Minimalista"**

TAYRO vive num fundo quase-preto (`#0A0A0A`) onde a tipografia carrega a tela sozinha — sem caixas, sem cartões, sem bordas decorativas. Contra esse silêncio, uma única **placa transparente** (`#E8E8E3`) flutua por tela: um retângulo claro com *crop marks* nos cantos, como se fosse a prova de impressão de um cronômetro de laboratório. É nela que mora o número mais importante da tela, ou a única ação pendente. Tudo o resto é texto correndo sobre o escuro, respirando por espaço em branco em vez de divisores.

O sistema nasceu de um antecessor mais barulhento (direção "1c") e o redesign 2a é deliberadamente sua versão contida: menos rótulos mono, menos divisores, um orçamento fixo de lime por tela. A rejeição confirmada é a estética de "app genérico com cards" — sem `bg-card`, sem pills `rounded-full` de status, sem ícones dentro de quadrados lime. O produto é sério (dinheiro, contratos, prazos) mas não burocrático: o número grande e o *tabular-nums* fazem o trabalho de transmitir precisão.

**Key Characteristics:**
- Uma placa clara por tela — nunca duas, nunca zero quando a tela tem um número herói ou uma decisão pendente
- Lime (`#C6FF33`) é orçamento escasso: aba ativa, um stat destacado, o pager, hover do botão primário — nunca decoração
- CARDS nunca-tabelas em listas; linhas com `gap-22px`, sem caixa, sem borda entre itens
- Números grandes (`d-hero` a `d-sm`) sempre em Space Grotesk 700 com `tabular-nums`

## Kinetic Editorial — a direção atual

> **Leia isto antes do resto.** Tudo abaixo desta seção descreve o **redesign 2a**, que foi **REMOVIDO do código em 2026-08-28** — tokens `plate`/`signal`, escala `d-*`, sombras de placa e os 9 primitivos. Fica como registro de onde o sistema veio; nada ali existe mais no `tailwind.config.ts`, então classe copiada de lá não vai renderizar.

"Kinetic Editorial" foi aprovada em 2026-08-16 a partir de dois mockups do Pedro e é a direção padrão do produto daqui pra frente. Estreou na aba Fila e está sendo estendida ao resto em levas.

Onde o 2a é contido e silencioso, o Kinetic é **editorial**: tipografia mais ousada, rótulo mono em caixa alta como assinatura de metadado, blocos retos no lugar de barras divididas, e a placa clara com *crop marks* **em lime** em vez de ticks cinza.

### Tokens (`tailwind.config.ts` → `colors.kinetic`)

| Token | Hex | Uso |
|---|---|---|
| `kinetic-black` | `#121212` | Fundo |
| `kinetic-dark` | `#1a1a1a` | Superfície elevada (linha selecionada, skeleton) |
| `kinetic-gray` | `#2a2a2a` | Borda de superfície, placeholder de imagem |
| `kinetic-border` | `#3a3a3a` | Borda de controle |
| `kinetic-muted` | `#888888` | Rótulo mono, legenda, status inerte |
| `kinetic-text` | `#d1d1d1` | Texto secundário forte |
| `kinetic-light` | `#e5e5e0` | Placa clara (mais quente que o `plate` do 2a) |
| `lime` | `#C6FF33` | **Mesmo token do 2a** — não duplicar |

### Primitivos (`components/primitives/kinetic/`)

| Componente | Substitui (2a) | Diferença que importa |
|---|---|---|
| `KineticPlate` | `Plate` | Crop marks em **L de 16px em lime**, sem sombra. `as` permite `<section>` quando a placa é região de conteúdo. **As marcas ocupam de 16px a 32px a partir da borda — conteúdo precisa de `pt` ≥ 40px, senão a marca atravessa o texto** |
| `KineticActions` | `PlateActionBar` | Blocos retos edge-to-edge separados por 1px; primário em lime, mono caixa alta (o 2a usa split bar com primário quase-preto em Space Grotesk) |
| `StatusWord` | `StatusPill` / `ContentStatusPill` | Status é **palavra**, não pill. Vocabulário único vindo de `utils/format.ts` |
| `StatFigure` | `StatBlock` | Rótulo mono caixa alta **em cima**, número embaixo (o 2a inverte) |
| `KineticRow` | linhas soltas | A linha é um **alvo**: selecionada ganha `kinetic-dark` + borda `kinetic-gray` |
| `KineticSegments` | `SegmentBar` | Segmentos retos, sem `rounded-sm` |

### As 6 regras

1. **Uma placa por tela** — ela carrega o que mais importa ali (o número no dashboard, a oferta no apply, a candidatura selecionada na Fila).
2. **Lime é ação, não decoração** — botão primário, nav ativa, crop marks e status que pede decisão sua. Nada mais.
3. **Mono só em rótulo e status** — JetBrains Mono caixa alta identifica metadado. Título e texto corrido, nunca.
4. **Controle não tem canto arredondado** — botão, tag e campo são retos. Só a placa e o avatar guardam raio.
5. **Foto p&b sobre a placa clara** — fora dela (hero do Story mobile, grade do feed), a cores. **Exceção: a landing (`/`) usa foto COLORIDA também sobre a placa** — decisão do Pedro em 2026-08-29, vale só ali. Nas telas do produto a regra continua valendo.
6. **Tudo em português** — inglês sobrou só em nome de token e de variável. Ver `CLAUDE.md` → Design system.

### Caixa alta vem do CSS, não do texto

Rótulo mono é escrito em minúsculas no JSX e sobe pra caixa alta com `uppercase`. O texto no DOM continua sendo o que a pessoa escreveu — busca por texto em teste e leitor de tela não mudam. Não escrever `"CONTEÚDOS A REVISAR"` no JSX.

### Status: um vocabulário só

Os quatro mapas vivem em `utils/format.ts` (`applicationStatusWord`, `campaignStatusWord`, `contentStatusWord`, `rewardStatusWord`) e são a fonte única. A migração unificou o vocabulário: onde o 2a dizia "Análise"/"Fechada" para candidatura, o Kinetic diz **"Pendente"/"Aprovada"** — as mesmas palavras que a marca já lê na Fila. Conteúdo concorda no masculino ("Aprovado"); candidatura, campanha e recompensa no feminino. A exceção deliberada é o `creatorRewardStatusWord`: o MESMO status de recompensa dito da ótica de quem espera ("A receber"/"A caminho") em vez da de quem paga ("Pendente"/"Emitida"). Não unificar — são perspectivas, não drift. Recompensa é o único domínio com **dois** estados acionáveis (`PENDING` pede emitir, `ISSUED` pede confirmar entrega) — os dois saem em lime.

### A landing tem componentes próprios

`/` é a única superfície com componentes de identidade FORA de `components/primitives/kinetic/`: eles vivem em `pages/public/landing/` e são locais de propósito. A landing é uma peça de marketing com anatomia própria (placa de candidatura decorativa, Story de demonstração, o ciclo dos dois lados) que não se repete no produto — promover isso a primitivo compartilhado criaria API pra um consumidor só. Se algum dia uma segunda tela precisar da mesma peça, aí sim ela sobe pra `primitives/kinetic/`.

### Estado da migração

**Todas as telas estão em Kinetic** desde 2026-08-28, e o 2a foi removido do código no mesmo dia:

- **Apagados** (9 primitivos, zero consumidores): `Plate`, `PlateActionBar`, `StatusPill`, `StatBlock`, `TabsUnderline`, `SegmentBar`, `ContentStatusPill`, `ProgressBar`, `Avatar`.
- **Migrados e movidos pra `primitives/kinetic/`:** `PlateField` → `KineticField`, `PlateTextarea` → `KineticTextarea`, e o `NicheSelector` (que ganhou `aria-pressed` — era um toggle que só comunicava estado por cor).
- **Removidos do `tailwind.config.ts`:** os tokens `plate.*` e `signal.*`, a escala de display `d-*` e as sombras `plate`/`plate-lg`.
- **`primitives/` ficou só com o que é neutro de design:** `CountUp`, `EmptyState`, `ThumbGrid`. Tudo que carrega a identidade vive em `primitives/kinetic/`.

---

# Redesign 2a — REMOVIDO (histórico)

> Nada abaixo existe mais no código. Mantido como registro da direção anterior e do raciocínio por trás dela. Para o sistema vivo, ver a seção "Kinetic Editorial" acima.

## Colors

Paleta de duas superfícies: o fundo escuro do app e a placa clara — cada uma com sua própria escala de neutros, e elas nunca se misturam num mesmo elemento.

### Primary
- **Lime** (`#C6FF33`): a única cor de ênfase do sistema. Aba ativa, um stat "destacado" por tela (borda + glow), o pager, e o hover do botão primário — nunca mais que isso na mesma tela (Regra do Orçamento de Lime).

### Neutral — fundo escuro
- **Background** (`#0A0A0A`): fundo do app inteiro.
- **Foreground** (`#EDEDE8`): texto principal, levemente quente.
- **Border** (`#232323`): borda externa de campo/divisor.
- **Muted background** (`#1A1A1A`): divisores internos, trilha de toggle desligado.
- **Muted foreground** (`#7C7C74`): labels e legendas — piso de contraste do sistema (4.71:1 em `#0A0A0A`, WCAG AA). Era `#75756E` (4.27:1, reprovava AA) até o critique de 2026-08-15 — o pass "minimalista" que afundou esse tom não tinha sido totalmente corrigido; agora o piso é literal, não escurecer abaixo disso quebra AA de verdade, não só a leitura.
- **Support text** (`#8A8A85`): texto de apoio em parágrafo, um degrau acima do muted-foreground.
- **Mono index** (`#7C7C74`): numeração de lista e o código da campanha no header. Consolidado com muted-foreground no critique de 2026-08-15 — era `#6E6E68` (3.86:1, reprovava AA por margem maior), a distinção visual entre os dois papéis não sobrevive ao piso de acessibilidade.

### Neutral — sobre a placa
- **Plate** (`#E8E8E3`): fundo da placa, o único elemento claro da tela.
- **Plate ink** (`#0E0E0E`): números e texto forte sobre a placa.
- **Plate body** (`#242420`): texto corrido sobre a placa (citações, feedback).
- **Plate muted** (`#6A6A64`): secundário sobre a placa (handle, labels de campo).
- **Plate soft** (`#7A7A74`): legenda de número sobre a placa.
- **Plate dim** (`#5C5C56`): frase de apoio sob o número herói.
- **Plate fill** (`#D4D4CD`): placeholder de imagem (avatar, grade do Instagram) até a foto real carregar.

### Signal (status)
- **Signal wait** (`#F5A524`): fundo sólido da pill "Análise"/"Revisar" — nunca `bg-x/10` + borda.
- **Signal dot** (`#D08A00`): bolinha "Aguardando resposta" sobre a placa.
- **Destructive/erro** (`#E86A5E` texto sobre `border #3A2320`): pill "Recusada", frases de erro.

### Named Rules
**A Regra do Orçamento de Lime.** Cada tela recebe até 4 usos de lime: aba ativa, um stat destacado, o pager, e o hover do botão primário. Nada além disso — inclusive em telas novas.

**A Regra da Placa Única.** Uma placa por tela, nunca duas. Ela carrega o maior número da tela (telas de leitura: Painel, Abertos, Ficha) ou a única ação pendente (telas de trabalho: Candidatura, Registro, Entregas) — nunca as duas coisas ao mesmo tempo.

**A Regra do Piso de Contraste.** `#7C7C74` para labels/legendas (mínimo que passa AA em `#0A0A0A`), `#8A8A85` para texto de apoio — nunca escurecer mais que isso; abaixo de `#7C7C74` a dupla texto/fundo já reprova 4.5:1.

## Typography

**Display Font:** Space Grotesk (com fallback `system-ui, sans-serif`)
**Body Font:** Inter (com fallback `sans-serif`)
**Label/Mono Font:** JetBrains Mono (com fallback `ui-monospace, monospace`)

**Character:** Space Grotesk carrega todo número, título e nome — peso 700 sempre, com tracking negativo agressivo que aperta a letra em tamanhos grandes (até `-.075em` no hero). É o que dá ao sistema sua sensação de "instrumento de precisão". Inter é neutro e legível para texto corrido. JetBrains Mono é usado com extrema escassez, reservado a 3 papéis fixos.

### Hierarquia de display (todos peso 700, `tabular-nums`)
- **d-hero** (88px, line-height .76, tracking -.075em): número herói da placa do dashboard.
- **d-xl** (46px, .76, -.07em): seguidores, engajamento, valores grandes dentro da placa.
- **d-lg** (40px, .8, -.065em): stats do dashboard da marca.
- **d-md** (30px, 1, -.05em): título de página ("Sua leitura", "Abertos").
- **d-inline** (28px, 1, -.055em): contador inline no header ("4/10").
- **d-sm** (24px, 1.1, -.05em): título de campanha/programa.
- **d-xs** (15px, 1.3, -.025em): título de seção e nome em linha de lista.

Sufixos de unidade dentro de um número (`%`, `k`) herdam o tracking mas em tamanho menor (ex.: número 88px → sufixo 38px).

### Escala de texto
15px/1.5 (citação/feedback na placa) · 14px/1.5 (frase de apoio, descrição) · 13px (@handle) · 12px (legenda, label de campo) · 11px (label de tab bar, dica de campo) · 10px mono tracking .1em (código de header) · 9px mono tracking .1em uppercase (pills de status).

### Named Rules
**A Regra do Mono Escasso.** Máximo 3 rótulos mono uppercase por tela: código da campanha no header, pills de status, índice de fila (`#01`). Todo outro rótulo é frase em português, minúscula, `font-sans`, abaixo do número que descreve.

## Layout

Padding lateral de tela: 24px. Header: 60px de altura, sem borda inferior. Ritmo vertical de uma tela típica: título → placa 28px · placa → stats 32px · stats → título de seção 36px · título de seção → lista 20px · entre itens de lista 22px.

Placa: padding `30px 26px 26px` (variante com conteúdo solto) ou `26px 24px` (variante `flush`, com barra de ação colada na base); 28px entre blocos internos.

Responsivo: mobile-first, mocks de referência em 360px. Tab bar (`md:hidden`) no mobile, sidebar (`hidden md:flex`) no desktop. Conteúdo desktop em `mx-auto max-w-5xl`; a placa nunca passa de 520px de largura. O número herói cai de 88px para 72px abaixo de 340px de viewport.

### Named Rules
**A Regra dos Dois Divisores.** Máximo 2 divisores de linha por tela. O separador padrão é espaço em branco (`gap-[22px]` entre linhas, `mt-8` entre blocos); um divisor real só onde há troca de função (ex.: acima da barra de ação da placa).

## Elevation & Depth

O sistema é majoritariamente flat — sem sombra em cards ou linhas de lista. A única sombra normativa é a da placa, que a faz parecer fisicamente flutuar sobre o fundo escuro. Não existe elevação em camadas (`surface-container` etc.); a hierarquia é feita por tipografia e pelo contraste placa/fundo, não por profundidade.

### Shadow Vocabulary
- **plate** (`box-shadow: 0 22px 48px -22px rgba(0,0,0,.95)`): sombra padrão da placa.
- **plate-lg** (`box-shadow: 0 24px 50px -22px rgba(0,0,0,.95)`): variante para placas maiores/hero.
- **lime-glow** (`box-shadow: 0 0 24px -6px rgba(198,255,51,.3)`): exclusivo do stat "destacado" — nunca em outro elemento da mesma tela.

### Named Rules
**A Regra do Efeito Único.** Cada elemento carrega uma ênfase só: se tem borda lime, não tem glow além dela num vizinho; se tem fundo sólido, não tem borda. Exceção proposital: o stat destacado usa borda lime + glow, porque é o único por tela.

## Shapes

Radius de 8px na placa e em qualquer superfície equivalente a card; 3–4px em thumbnails, pills de status e tags de nicho; 2px nos segmentos do `SegmentBar`. Nichos e tags são sempre quadrados (`rounded-sm`/`rounded-[3px]`) — o `rounded-full` de pill é reservado exclusivamente a status.

## Components

### Placa (Plate) — componente de assinatura
A âncora visual do sistema: retângulo `bg-plate` com `shadow-plate`, cantos com *crop marks* decorativos (`aria-hidden`) em 2 variantes — `marks="all"` (4 cantos, telas de leitura) ou `marks="top"` (2 cantos, cards/formulários). Variante `flush` remove o padding interno para acomodar uma `PlateActionBar` colada na base. Nunca mais de uma por tela.

### Botões (via PlateActionBar)
- **Shape:** sem radius — a barra ocupa a largura total da base da placa, separada por `border-t plate-line`.
- **Primário:** `flex-1`, fundo `plate-ink`, texto `foreground`, 56px de altura.
- **Hover:** o botão inteiro inverte — fundo vira lime, texto vira `plate-ink`, 140ms.
- **Secundário (opcional):** largura fixa (100–106px conforme a tela), texto `plate-muted`; hover inverte para fundo `plate-ink` / texto `plate`.
- **Disabled:** `opacity-40`, hover desativado.

### Status Pills
Fundo sólido nos dois estados que importam (Análise = `signal-wait`, Fechada/Ativa = `lime`), outline puro (`border #2A2A2A`, texto `muted-foreground`) no estado inerte (Rascunho, Encerrada, Retirada) — nunca o padrão `bg-x/10 + border-x/20`. Sempre `font-mono text-[9px] uppercase tracking-[.1em]`, radius 3px.

### Linhas de lista (substituem cards)
Sem caixa, sem borda entre itens — `gap-[22px]` verticalmente. Índice mono à esquerda, título `d-xs`, metadado 12px, `StatusPill` ou `chevron-right` (`#4A4A46`) à direita. Hover: `bg-accent` (`#232323`), radius 8px, padding-x levemente negativo.

### Campos de formulário
Sem caixa — só `border-b`. Sobre o fundo escuro: `border-b #232323`, placeholder `#55554F`, foco vira `border-b` lime + caret lime. Sobre a placa: `border-b rgba(14,14,14,.18)`, foco vira `border-b plate-ink`. Label 11–12px acima do campo, 24px entre campos.

### Toggle
Usa a paleta da placa, não o lime — trilha `#E8E8E3` / knob `#0A0A0A` quando ligado; trilha `#1C1C1C` + `border #232323` / knob `#55554F` quando desligado. 44×24px.

### Segment Bar (fila de vagas/candidaturas)
Barra de segmentos (altura 14px, gap 4px, radius 2px): preenchidos `plate-ink`, vazios `plate-ink/[.14]`. `total` é sempre o número real do domínio (ex. `maxSpots`), não um valor arredondado.

## Do's and Don'ts

### Do:
- **Do** manter uma única placa por tela, escolhida entre "maior número" ou "ação pendente" — nunca as duas.
- **Do** usar `tabular-nums` em todo número e animar sua entrada com `translateY(30%)→0` + fade, 640ms, `cubic-bezier(.2,.9,.25,1)`, escalonado por 120ms entre números da mesma tela.
- **Do** respeitar o piso de contraste do secundário (`#7C7C74`/`#8A8A85`) — não escurecer mais.
- **Do** usar tags quadradas para nicho/categoria; reservar `rounded-full` só para status.
- **Do** respeitar `prefers-reduced-motion` (`motion-reduce:animate-none`) em toda animação.

### Don't:
- **Don't** usar mais de 3 rótulos mono uppercase ou mais de 2 divisores de linha por tela.
- **Don't** empilhar efeitos no mesmo elemento (borda + glow, fundo sólido + borda) fora da exceção do stat destacado.
- **Don't** usar `bg-card`, `bg-secondary/40`, ou qualquer caixa com fundo sutil como container — o padrão 2a é tipografia direta sobre o fundo, sem caixa.
- **Don't** usar pills `bg-x/10 + border-x/20` para status — sempre fundo sólido ou outline puro.
- **Don't** gastar lime fora do orçamento de 4 usos por tela (aba ativa, stat destacado, pager, hover do botão primário).
