# TAYRO — Contexto do Projeto

> Versionado no repositório — precisa sobreviver entre dispositivos (já foi perdido 2x enquanto gitignored: 2026-06-17 e 2026-08-05; agora versionado de propósito). Detalhe específico de uma máquina só (não do projeto em si) vai em `CLAUDE.local.md`, esse sim gitignored.

## O que é
CRM de creators fitness, **creator-first**. MVP de plataforma de marketing de influência. Infra real = Neon (Postgres serverless).

## Stack
- **Monorepo:** Turborepo (npm workspaces) — `apps/api` + `apps/web`
- **API:** NestJS (Clean Architecture) · Prisma · PostgreSQL (Neon) · JWT (access + refresh com rotação SHA-256) · Jest
- **Web:** React + Vite · React Router (BrowserRouter) · Zustand · TanStack Query · Tailwind · Vitest + Testing Library
- **Deploy:** API → Railway · Web → Vercel · CI/CD → GitHub Actions

## URLs de produção
- Web: https://tayro-app.vercel.app
- API: https://api-production-a813.up.railway.app (prefixo global `api/v1`)
- Railway Service ID: `f0afafae-1cd2-41e2-b462-8c413dd53209`
- **Railway: plano Hobby (pago, US$5/mês) desde 2026-07-05.** Trial de créditos grátis acabou silenciosamente (sem aviso) e derrubou a API em prod — `curl` na API respondia 404 do EDGE do Railway ("Application not found"), não do NestJS. Banco (Neon) não é afetado por isso, só o compute. Se a API cair de novo do nada, checar billing do Railway ANTES de investigar código/deploy.
- **Neon tem 2 branches: dev e prod, com hosts DIFERENTES.** `apps/api/.env` local aponta pro branch de **dev**. A `DATABASE_URL` de prod fica só no Railway (env do serviço), nunca no `.env` local — dev e prod NÃO compartilham o mesmo banco. Pegadinha: o branch de dev pode conter uma cópia real de dados de creators (ex: handles reais), então "ver dado real" ao consultar o `.env` local NÃO prova que é prod — já causou confusão (2026-08-03). Migrations locais (`prisma migrate deploy` manual) só afetam o branch de DEV; produção só recebe migration via CD.
- **CD flaky no deploy da API (RESOLVIDO v0.27.0/#74):** o passo `railway up --ci` falhava esporadicamente com `Failed to stream build logs` (~65s após início), mesmo com o deploy real completando OK no Railway — falso-negativo do CLI, não do build. Confirmado 2x (2026-08-03, runs #38 e #40). Fix: retry de 1 tentativa extra no workflow. Se falhar nas 2 tentativas, aí sim é falha real.

## CI/CD
- **CI** (`.github/workflows/ci.yml`): roda em todo PR — lint · typecheck · test · build (API e Web).
- **CD** (`.github/workflows/cd.yml`): no merge em `main`, após CI passar → migrations + deploy.
- **Git Flow:** `feature/* → develop → main`, sempre via PR. Branches protegidas (CI obrigatório).

## Regras de segurança (invioláveis)
- Secrets SEMPRE em `.env` / GitHub Secrets. Nunca no bundle, logs ou erros HTTP.
- Guards em TODA rota autenticada. Endpoint público deve ser explícito e documentado.
- `@MaxLength()` em todo campo de texto livre (DTOs) — defesa contra payload spam/DoS.
- Refresh token invalidado no uso (rotation). Token roubado não pode mint forever.
- CORS com allow-list explícita.
- Throttle específico em `/auth/*` (5 req / 15 min por IP).
- Erros de infra (Prisma, HTTP externo) nunca vazam stack trace pro cliente.

## Princípios de colaboração
- **TDD obrigatório.** Humano decide O QUÊ; agente levanta flags e sugere proteções não pedidas.
- Small releases, refactoring contínuo, segurança como hábito.
- Pedro quer aprender TODO o ciclo (requisitos → produção) e ser desafiado.
- **Performance é obrigatória.** Em toda query Prisma: preferir `include`/`select` a loops (N+1). Toda operação check-then-act DEVE estar em `prisma.$transaction()`. Nunca aprovar/criar recursos sem atomicidade.

## Feito
- Segurança: refresh token rotation, campaigns visibility guard
- Segurança #3/#4/#5 (PR #20): throttle `/auth` (5/15min; ThrottlerGuard global que faltava), `@MaxLength` em TODOS os DTOs de texto livre (password=72 p/ bcrypt), CORS fail-fast se `ALLOWED_ORIGINS` ausente em prod. `ALLOWED_ORIGINS` corrigido no Railway (era localhost).
- Performance: detector de N+1 (`QueryCounter`) + fix de race conditions (approve com `$transaction` Serializable; creators trata P2002). `create()` era falso positivo (pending não conta p/ maxSpots)
- **P2 brand COMPLETA:**
  - Detalhe de campanha — 4 abas: Visão Geral (v0.2.0/#22), Conteúdos (v0.3.0/#23, endpoint `GET /submissions/campaign/:id` sem N+1), Recompensas (v0.4.0/#25, fluxo PENDING→ISSUED→DELIVERED; fix: create exigia conteúdo APROVADO → relaxado p/ application aprovada)
  - Dashboard (v0.5.0/#27): `GET /brand/dashboard` agregação sem N+1 (groupBy/count num único `$transaction`)
  - Cadastro de marca (v0.6.0/#29): `/register/brand` com auto-login
  - Perfil de marca (v0.7.0/#31): `GET/PATCH /brands/me` + `/brand/profile`
- **P3 creator — fundação (v0.8.0/#33, #35):** InfluencerLayout + InfluencerGuard, `/register/influencer` UI, "Minhas candidaturas" (status via `useMyApplications`). Fix: cadastro de creator com conflito de handle/email → 409 com discriminador `field` + msg amigável (antes P2002 não tratado → 500 → "Erro de conexão"); front mostra msg real inline, "sem conexão" só quando request não chega. Removido check-then-act de email (race fechada via `@unique`).
- **P3 creator — perfil (v0.9.0/#36):** API `GET/PATCH /influencers/me` (InfluencersController, flatten email, P2025→Forbidden) · DTO `UpdateInfluencerDto` (sem instagramHandle — imutável neste fluxo) · Frontend `/influencer/profile` (4 cards: identidade, sobre, perfil público LGPD toggle, conta; form só ativo se dirty; email read-only).
- **P3 creator — browse (v0.10.0/#39):** Frontend `BrowseProgramsPage` (grid responsivo, paginação com `keepPreviousData`, skeleton, empty state, erro) · `ProgramCard` (link `/apply/:id`, oferta em lime, nichos, deadline, vagas) · hook `useBrowsePrograms` · rota `/influencer/browse` como index.
- **Responsividade mobile-first (v0.11.0):** Todo o produto responsivo em 360/768/1024/1280px. InfluencerLayout + BrandLayout: sidebar `hidden md:flex`, mobile header (logo + logout) + bottom tab bar fixo com `env(safe-area-inset-bottom)`. CampaignDetailPage: tabs `overflow-x-auto shrink-0` (4 labels longos não cabem em 360px). Todas as telas: `px-4 sm:px-6`, `py-6 sm:py-8`, `text-xl sm:text-2xl`. Botões de auth `min-h-[44px]`. PublicApplyPage: `break-words` na descrição, `min-h-[44px]` no CTA. `viewport-fit=cover` no index.html.
- **Logo clicável + botão voltar (v0.12.0/#43):** Logo "tayro" em InfluencerLayout → `/influencer`, BrandLayout → `/brand`, PublicApplyPage → `/login`. Botão `← Voltar` (`navigate(-1)`) no header do PublicApplyPage.
- **Dashboard creator (v0.13.0/#45):** `/influencer/dashboard` como nova home (index redireciona para cá). 3 pills de resumo (candidaturas totais, aprovadas, recompensas a receber), últimas 4 candidaturas com StatusPill, recompensas PENDING+ISSUED. Nav do creator: 4 itens (Início, Programas, Candidaturas, Perfil). Hook `useMyRewards` + tipo `MyReward`.
- **Envio de conteúdo (v0.14.0/#47):** `/influencer/submissions` — lista de conteúdos com status (Em análise/Aprovado/Recusado/Revisar) + feedback da marca. Modal "Enviar conteúdo": seletor de candidatura APPROVED, URL, tipo (Reel/Vídeo/Foto/Story), legenda. MyApplicationsPage: cards APPROVED ganham link "Enviar conteúdo" → `/submissions?apply=<id>`. Nav: 5 itens (Início, Programas, Aplicações, Conteúdo, Perfil). Hooks `useMySubmissions` + `useCreateSubmission`, tipo `MySubmission`.
- **Minhas recompensas (v0.15.0/#49):** `/influencer/rewards` — lista de recompensas com tipo (Pagamento/Produto/Desconto), valor, StatusPill (A receber/A caminho/Entregue), notas e data de emissão. Pills de resumo no topo. Dashboard: pill "a receber" vira Link clicável para `/influencer/rewards`.
- **Integração Instagram real via RapidAPI (v0.16.0/#52):** `RapidApiInstagramProvider` — fluxo 2 passos (`GET /profile?username=` → `pk`+`follower_count`; `GET /feed?user_id={pk}` → posts). Profile obrigatório (2 retries, lança `InstagramFetchError`); feed best-effort (falha/privado → `recentPosts: []`, followers preservados). DI token `INSTAGRAM_PROVIDER` troca `stub`↔`rapidapi` via env.
- **Polimento do card de candidatura (v0.17.0/#55):** thumbnails maiores (`grid grid-cols-6` em vez de faixa `flex`), handle do IG vira link clicável (`ExternalLink` icon) pra marca abrir o perfil.
- **Foto de perfil do IG no card (v0.18.0/#56):** campo `igProfilePicUrl` (migration `add_ig_profile_pic_url`), mapeado de `hd_profile_pic_url_info.url` no provider, salvo pelo `InstagramSyncService`, exposto no `influencerSelect`.
- **Fix autocorrect + log de erro do sync (v0.19.0/#58):** iOS mutilava handles digitados (`__` virava `_`) por falta de `autoCorrect="off"` nos inputs de handle (`PublicApplyPage`, `RegisterInfluencerPage`). Log de erro do `InstagramSyncService` melhorado (mensagem real do erro, não só stack genérico).
- **Fix `@@handle` no sync (v0.20.0/#60):** handles inseridos fora do fluxo padrão (ex: edição direta no Neon) podiam ter `@` prefixado → sync construía URL com `%40handle` → API rejeitava. `InstagramSyncService.refresh()` agora normaliza (`replace(/^@+/, '')`) defensivamente antes de chamar o provider.
- **Fallback `profile_pic_url` (v0.21.0/#62):** `hd_profile_pic_url_info` nem sempre vem no response da API (depende da conta). Fallback: `hd_profile_pic_url_info?.url ?? profile_pic_url ?? null`.
- **Botão "Atualizar" no estado OK (v0.22.0/#64):** o refresh manual do IG só aparecia com `igFetchStatus=FAILED`. Cards em OK mas com dados velhos (foto ausente pré-fallback, thumbnails de CDN expirada) ficavam sem escapatória — backend já suportava `force:true` com cooldown de 15min, faltava só expor o botão também no estado OK. `RefreshButton` extraído e reusado nos dois estados.
- **Proxy same-origin pra foto de perfil do IG (v0.23.0/#65):** ver "Footgun CORP" na seção de decisões de domínio. `GET /ig/avatar/:influencerId` (público, `@SkipThrottle`) busca a foto server-side e re-serve com `CORP: cross-origin`. SSRF fechado: URL só vem do banco (nunca do cliente) + allow-list de host (`.cdninstagram.com`/`.fbcdn.net`, checado por sufixo) + timeout.
- **Apply autenticado direto do browse (v0.24.0/#67):** backend (`POST /applications`, role INFLUENCER) já existia — gap era só frontend. `ProgramCard` vira modal de confirmação (mensagem opcional) em vez de mandar a creator logada pro fluxo público `/apply/:id` (que criava conta duplicada). Fix junto: copy sem gênero assumido ("perfeita"→"ideal", "creator aprovada"→"candidatura aprovada").
- **E-mail de aprovação/recusa (v0.25.0/#69):** `EmailModule` novo — mesmo padrão do Instagram (interface `EmailProvider` + DI token `EMAIL_PROVIDER`, `stub`|`resend`). Disparo best-effort (nunca derruba approve/reject) em `ApplicationsService.approve()`/`.reject()`. `EMAIL_PROVIDER=stub` em prod até ter domínio verificado no Resend (Pedro decidiu comprar domínio real só no fim do MVP — sandbox do Resend só entrega pro próprio e-mail da conta).
- **Claim/set-password de conta CLAIMABLE (v0.26.0/#71):** `User.claimTokenHash`(`@unique`, hash SHA-256)+`claimTokenExpiresAt` (7 dias). Emitido na criação da conta (`CreatorsService.findOrCreateInfluencer`, sem N+1) + e-mail via `EmailService.sendClaimAccount`. Reaplicar com token ainda não usado reemite+reenvia automaticamente (fecha caso de link expirado). `POST /auth/claim` reaproveita `buildAuthResponse` — auto-login. Frontend `/claim?token=` (público, fora de guards). `StubEmailProvider` loga qualquer link do corpo do e-mail (fix v0.27.0/#73) — é a única forma de pegar o link do claim em dev sem configurar Resend de verdade.
- **Preview de identidade no Claim (v0.29.0):** `GET /auth/claim/:token` (novo, público, throttled) traz identidade (handle/e-mail/avatar/`influencerId`) + título da candidatura mais recente SEM consumir o token — ao contrário do `POST /auth/claim`. Fecha a limitação conhecida de link inválido/expirado só aparecer no erro do submit: agora `ClaimAccountPage` mostra a mensagem já na carga da página (401 do preview = mesma UX de token inválido). Se o preview falhar por outro motivo (rede/5xx, não 401), degrada pro form sem a placa de identidade — quem valida o token de verdade continua sendo o POST. Frontend: hook `useClaimPreview` (padrão de hook dedicado + mock em teste, não `useQuery` inline), avatar via o mesmo proxy `/ig/avatar/:influencerId` já usado no `ApplicationCard`.
- Estrutura de testes (Jest + Vitest): **137 testes API + 96 web** (2026-08-05)
- CI/CD completo + Git Flow + branch protection
- Deploy funcionando: API (Railway) + Web (Vercel) + migrations (Neon). Auto-deploy nativo do Railway DESLIGADO (Actions é o único gatilho); serviço "web" vestigial do Railway removido
- SPA routing fix (vercel.json), build do Railway com prisma generate
- Rename ugc-platform → tayro (código + Neon project)
- **Redesign visual TAYRO 2a (v0.29.0, PR #80):** implementação do handoff `apps/web/design_handoff_tayro_2a/` (gitignored, referência local, não é código de produção). Dark-first (`#0A0A0A`), lime `#C6FF33`, "placa" (plate) como elemento de assinatura. Primitives novos: `Plate`, `CountUp`, `SegmentBar`, `StatusPill`, `StatBlock`, `ContentStatusPill`, `TabsUnderline`, `PlateField`, `PlateTextarea`, `PlateActionBar`, `NicheSelector` (variant `dark`|`plate`, tag quadrada — sem pill lime), `PlateEditField`/`PlateEditNiches` (row label+valor+chevron abre modal placa-formulário de campo único — padrão literal do mock pro "Editar" do Perfil da creator e da marca). 16 telas do handoff reconstruídas. Backend: `GET /campaigns/mine` ganhou `approvedCount`/`pendingCount` via `Promise.all` (groupBy quebra tipagem dentro de `$transaction` array form). Fix de bug: placa em destaque de Programas (`CampaignsPage`) só aparece em "Todas"/"Ativas", nunca em Rascunho/Encerradas (antes vazava pra qualquer aba). Tela da creator renomeada "Ficha"→"Perfil" (nav + título, mais claro pro usuário).

## Convenção de release (develop → main)
- Título: `release: vX.Y.0 — <desc>` (SemVer pré-1.0; features de produto incrementam o minor)
- Corpo: changelog (`## O que vai pra produção` + `## Migrations`)
- PR de release é MANUAL — não abre ao mergear feature no develop. Última: v0.28.0 (#77).
- **SEMPRE usar merge commit, NUNCA squash** em releases. Squash cria commit sem ancestral comum → divergência de histórico → conflitos em futuros PRs. v0.8.0 usou squash (exceção pra limpar atribuição) e exigiu `git merge -s ours` em chore/sync-main-into-develop (PR #38) pra reconciliar.
- Releases antigos #1–#15 (infra/CI/CD) ficaram sem versão (pré-v0.1)

## Pendente
- **Gaps do MVP (levantamento 2026-08-03) — TODOS FECHADOS:** apply autenticado (v0.24.0) · e-mail de decisão (v0.25.0) · claim/set-password (v0.26.0) · preview de identidade no Claim (v0.29.0). Ver "Feito" pra detalhe de cada um.
  - Limitação conhecida, aceita por ora: sem reenvio manual de link de claim perdido (só reemite se reaplicar a um programa).
- **PWA** — pendente (responsividade concluída em v0.11.0).
  - `vite-plugin-pwa` + manifest + service worker.
  - Regra INVIOLÁVEL: service worker NUNCA cacheia `/auth/*` nem endpoints autenticados. Não interceptar silent refresh no AppShell boot.
  - `viewport-fit=cover` já está no index.html (adicionado na v0.11.0).

## Bugs conhecidos (backlog)
- **IG não vem completo na 1ª candidatura, exige "Atualizar" manual (reportado 2026-08-03):** Ana Flávia se candidatou pela 1ª vez a um programa (mentalmadness) e o card na marca mostrou "Dados do Instagram indisponíveis" (estado FAILED) — precisou clicar "Atualizar" manualmente pra puxar foto/feed/seguidores. Esperado: dados completos já na 1ª tentativa (`scheduleIgFetch` no apply, fire-and-forget via `setImmediate`). Hipótese não confirmada: falha na 1ª tentativa do `RapidApiInstagramProvider.getProfile()` (2 retries internos, mas sem retry automático posterior — só o cooldown de 15min do botão manual). Investigar logs do Railway no momento do apply antes de mexer no código.

## Design system
- Dark-first. BG #0C0C0C · surfaces #161616/#1E1E1E · borders #2C2C2C/#3A3A3A
- Lime #C6FF33 → Tailwind bg-lime/text-lime; shadcn --primary: 77 100% 60% (use o hex pra não ter drift)
- Accent quente #FF7A50 (recompensas/achievements) · frio #5B8EFF (links/ações 2árias)
- Texto #F0F0F0 / secundário #888888 · Sucesso #1EDB8C / Erro #FF4D4D
- Fontes: Space Grotesk (display/headings) · Inter (body). Stats com tabular-nums.
- CARDS, nunca tabelas. Avatares proeminentes. StatusPills coloridas. Copy encorajadora.
- **Redesign 2a (v0.29.0):** substitui os tokens acima em todas as telas migradas. BG `#0A0A0A`, lime `#C6FF33` mantido, "placa" `#E8E8E3` (card claro com crop marks) como elemento de assinatura — no máx. 1 por tela. JetBrains Mono (mono, máx. 3 usos/tela) somado a Space Grotesk/Inter. Ver `apps/web/design_handoff_tayro_2a/` (gitignored) pra spec completa. 6 regras do sistema: máx. 3 labels mono/tela, máx. 2 divisores/tela, sem efeitos empilhados, 1 "orçamento" de lime/tela, 1 placa/tela, piso de contraste no texto secundário.

## Decisões de domínio — não quebrar
- offer* em Campaign (offerAmount[centavos], offerType CASH|PRODUCT, offerDeadlineDays, offerDescription) = fonte de verdade da oferta. rewardType/rewardValue DEPRECATED — não escrever, não expor.
- Dinheiro SEMPRE em centavos (Int). Nunca float. Exibe com Intl.NumberFormat pt-BR/BRL.
- Campaign.status = máquina de estados DRAFT→ACTIVE→CLOSED→COMPLETED. Publicar é transição guardada (só DRAFT publica), não flag. Ativar deixa /apply/:id vivo.
- maxSpots = vagas para creators APROVADAS ≠ total de applications. Não confundir no UI.
- Instagram: interface InstagramProvider + DI token INSTAGRAM_PROVIDER. Stub determinístico = default dev; RapidApi via env (mapeamento isolado, sem hardcode). Staleness 24h. Cooldown refresh-ig 15min carimbado em TODA tentativa (inclusive falha — senão FAILED é spammável e queima cota). Falha preserva último valor. calcEngagementRate = (likes+comments)/followers×100 (função pura testada). `igProfilePicUrl` = `hd_profile_pic_url_info.url ?? profile_pic_url ?? null` (v0.21.0).
- **Footgun CORP (JÁ NOS MORDEU, não repetir):** Instagram serve fotos de PERFIL (path `t51.82787-19`) com `Cross-Origin-Resource-Policy: same-origin` — browser bloqueia num `<img>` cross-origin, mesmo com URL válida e pública. Thumbnails do FEED (`t51.71878-15`) vêm com `cross-origin` e carregam normal — política diferente por tipo de mídia, mesma CDN. Não é contornável no frontend (nem `referrerPolicy` nem `crossorigin` resolvem). Fix: proxy same-origin (`GET /ig/avatar/:influencerId`, v0.23.0) — servidor busca a imagem (CORP não vale server-to-server) e re-serve pelo nosso domínio. Se algum dia a foto de perfil sumir de novo, ANTES de suspeitar do dado, inspecionar os response headers da URL da CDN.
- Perfil público de creator: publicProfileEnabled default false (LGPD). Só via GET /creators/:handle/public quando true.
- /apply/:id: cria conta creator leve CLAIMABLE (senha aleatória, ninguém sabe), chaveada por handle+email real. Claim via POST /auth/claim (v0.26.0) — ver "Feito".

## Auth no frontend — footguns (JÁ NOS MORDEU, não repetir)
- accessToken em Zustand (memória), NUNCA localStorage/sessionStorage. Refresh em cookie httpOnly.
- Silent refresh no boot do AppShell; guards avaliam SÓ depois do refresh resolver (senão race → /login).
- Interceptor de 401 NÃO usa window.location (loop de reload). Usa navigate do router, máx 1 redirect.
- /auth/refresh e /auth/login ISENTOS do retry de refresh do interceptor (senão loop infinito — foi o bug do login travado).
- Poll-while-PENDING (teto ~45s) pra dados de IG assíncronos.

## Telas prontas (frontend) — não reconstruir
- /login + /register/brand (AuthLayout; /register → /register/brand) · BrandLayout (sidebar Dashboard/Programas/Perfil) + BrandGuard
- /brand/dashboard (DashboardPage: "Precisa de atenção" + cards de métrica via `useDashboard`)
- /brand/campaigns/:id → 4 abas:
  - Candidaturas: ApplicationCard (thumbnails 6col, foto de perfil via proxy `/ig/avatar/:id`, handle clicável), 3 estados IG (PENDING/FAILED+retry/OK, botão "Atualizar" nos dois últimos), poll-while-PENDING, filtro, approve/reject
  - Visão Geral (CampaignOverviewTab) · Conteúdos (CampaignContentTab, aprovar/recusar/revisão) · Recompensas (CampaignRewardsTab, modal de registro + issue/deliver)
- /brand/campaigns (lista+filtro) · /brand/campaigns/new (form rhf+zod, toggle CASH/PRODUCT, centavos, modal publicar + link /apply/:id)
- /brand/profile (ProfilePage: rows label+valor+chevron abrem modal placa-formulário por campo — PlateEditField/PlateEditNiches, padrão 2a; email read-only, salvar só habilita se dirty)
- /apply/:id (página pública: oferta, form, estados 201/409/429) — responsivo (px-4 sm:px-6, min-h-[44px] no CTA, break-words na descrição)
- **Creator (v0.8.0):** InfluencerLayout + InfluencerGuard · /register/influencer (rhf+zod, NicheSelector, erro inline por `field` vindo do 409) · /influencer (minhas candidaturas via `useMyApplications`)
- **Creator (v0.9.0, renomeada "Ficha"→"Perfil" no redesign 2a):** /influencer/profile (rows label+valor+chevron abrem modal placa-formulário por campo — PlateEditField/PlateEditNiches; toggle LGPD inline; dirty gate; email read-only)
- **Creator (v0.10.0):** /influencer/browse (grid + paginação, ProgramCard, link /apply/:id)
- **Creator (v0.13.0):** /influencer/dashboard (nova home/index) — 3 pills de resumo, últimas 4 candidaturas, recompensas PENDING+ISSUED. Nav 4 itens.
- **Creator (v0.14.0):** /influencer/submissions — lista com status + feedback, modal "Enviar conteúdo". Nav 5 itens (+ Conteúdo).
- **Creator (v0.15.0):** /influencer/rewards — lista de recompensas (tipo, valor, StatusPill, notas, data de emissão).
- **Claim (v0.26.0, preview de identidade v0.29.0):** /claim?token= (AuthLayout) — placa confirma quem é (avatar/@handle/e-mail) e o programa da candidatura antes do form de senha (`useClaimPreview`), link inválido/expirado detectado já na carga (não só no submit), auto-login, erros 401/429/sem-conexão.
- Helpers compartilhados em `utils/format.ts`: formatCurrency, formatDate, formatOffer (não duplicar)

## Convenções de trabalho (somar às de performance)
- Ler controllers/DTOs REAIS antes de assumir shape. Nunca inventar contrato.
- Um chunk por vez: PASSO 0 (contratos/gap) → OK → implementar.
- Rotas: literais antes de :id; públicas fora de guards.
- Labels/textos derivados do estado de domínio (ex: "pagamento" vs "envio" por offerType), não hardcoded.
- **Testar comportamento, não render:** mockar hooks só valida UI. Cobrir o happy path real + os gates de negócio. Antes de construir UI sobre endpoint "que já existe", LER a validação dele (mordeu em Recompensas: create exigia conteúdo aprovado, falhou silencioso em prod).
- **Manter este CLAUDE.md atualizado:** ao concluir feature/release, atualizar Feito / Pendente / Telas prontas.
