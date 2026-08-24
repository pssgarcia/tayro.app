---
slug: creator-discovery-and-apply
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-23
implements:
  - apps/api/src/modules/campaigns/presentation/campaigns.controller.ts
  - apps/api/src/modules/campaigns/application/campaigns.service.ts
  - apps/api/src/modules/creators/presentation/programs-public.controller.ts
  - apps/api/src/modules/creators/application/creators.service.ts
  - apps/web/src/pages/public/PublicApplyPage.tsx
  - apps/web/src/pages/public/BrowseProgramsPublicPage.tsx
  - apps/web/src/pages/influencer/BrowseProgramsPage.tsx
  - apps/web/src/pages/influencer/ProgramsList.tsx
  - apps/web/src/pages/influencer/ProgramDetailPage.tsx
  - apps/web/src/pages/influencer/ApplyModal.tsx
related_decisions: [D-05]
---

# Descoberta e candidatura da creator

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. Duas motivações documentadas em `CLAUDE.md` → "Feito" compõem esta
capacidade: (1) permitir que a creator autenticada decida com informação completa antes de se
candidatar, em vez de um modal abrir direto por cima da listagem; (2) dar acesso a programas
abertos a um visitante **sem conta**, atacando o risco (não testado por entrevista — `n=0`) de
a creator não querer criar mais uma plataforma antes de ver se vale a pena.

## Scope
Descoberta de programas pela creator (autenticada e anônima) e o fluxo de candidatura — tanto
público (cria conta) quanto autenticado (usa sessão existente).

## Out of Scope
- Máquina de estados de `Application` após criada — ver `applications-pipeline`.
- Ciclo de vida da conta `CLAIMABLE` criada no apply público (token, expiração, set-password) —
  ver `account-claim`.
- Descoberta de **creators pela marca** (o inverso desta capacidade) — não existe hoje; lacuna
  conhecida, ver `CLAUDE.md` → "Pendente".

## Domain
Não introduz modelo próprio. Opera sobre `Campaign` (ver `campaign-lifecycle`), cria
`User`/`Influencer` sob demanda no primeiro apply de um handle/e-mail nunca visto (conta
`CLAIMABLE`, ver `account-claim`) e cria `Application` (ver `applications-pipeline`).

## Behavior

### Três superfícies, uma listagem
- **Browse autenticado** (creator logada) — grid paginado de campanhas `ACTIVE`; o card só
  navega para o detalhe, nunca abre modal de candidatura direto da listagem.
- **Vitrine pública** (sem login) — mesma listagem; o destino do card depende de haver ou não
  sessão de creator ativa no momento do clique (detalhe autenticado se houver, fluxo público se
  não houver).
- **Detalhe do programa** (autenticado) — mostra a oferta completa, prazo, vagas, nichos e
  descrição antes de qualquer decisão. Se já existe candidatura da creator para a campanha
  (qualquer status), mostra o status em vez de permitir recandidatura — o par
  `(campanha, influencer)` é único, então uma segunda tentativa seria sempre rejeitada.

### Candidatura pública (sem login) — regras de negócio
1. A campanha precisa existir e estar `ACTIVE`; caso contrário a candidatura é recusada.
2. A pessoa é resolvida por Instagram handle primeiro; se não achar por handle, por e-mail.
3. Se o e-mail já pertence a uma conta que **não** é de creator (ex.: conta de marca), a
   candidatura é recusada — o fluxo público nunca reaproveita ou sobrescreve uma conta de outro
   papel.
4. Se a pessoa já tem conta de creator mas ainda não definiu senha (conta `CLAIMABLE` sem
   claim concluído), reaplicar a um programa reemite e reenvia o link de definição de senha
   automaticamente — é o único jeito de recuperar um link de claim expirado hoje (ver
   `account-claim`).
5. Se a pessoa já tem conta de creator sem handle de Instagram registrado (cadastro criado por
   outro caminho), o handle usado nesta candidatura passa a ser o dela.
6. Se a pessoa nunca existiu no sistema, uma conta de creator é criada (com senha que ninguém
   conhece — ver `account-claim`) e um e-mail de definição de senha é enviado.
7. **Concorrência:** duas candidaturas simultâneas com o mesmo handle/e-mail nunca resultam em
   contas duplicadas nem em erro de servidor não tratado — a segunda a chegar reaproveita o
   registro que a primeira acabou de criar.
8. Candidatar-se de novo à mesma campanha (mesma pessoa) é recusado — não cria uma segunda
   candidatura.
9. A busca de dados do Instagram da pessoa é disparada em paralelo e não atrasa nem condiciona
   a resposta da candidatura (best-effort, ver `instagram-sync`).
10. **Nada acessório derruba a candidatura.** A candidatura é o evento de conversão do produto
   — o único momento em que uma creator sem conta entra no funil. Emitir o token de claim,
   montar o link, enviar o e-mail e disparar a busca do Instagram são todos efeitos colaterais:
   qualquer um deles falhando (config ausente, provedor fora do ar, erro de escrita do token) é
   registrado e a candidatura segue. Só falha de verdade o que impede a candidatura de existir:
   campanha inválida, conta de outro papel, duplicidade e falha ao gravar a própria
   `Application`.

Candidatura autenticada (creator já logada, via modal no detalhe do programa) segue as mesmas
regras 1 e 8, sem os passos de resolução/criação de conta (a sessão já identifica a pessoa).

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| `GET` | `/campaigns` | opcional (viewer pode ser anônimo) | Só `status=ACTIVE`. Instrumentado com contador anônimo/autenticado. |
| `GET` | `/campaigns/:id` | opcional | `ACTIVE` é público; outro status só visível pro dono (404 uniforme). |
| `POST` | `/programs/:id/apply/public` | throttle 5 req/60s por IP | Público. Cria conta `CLAIMABLE` se necessário. `201`; `400` campanha não `ACTIVE`/inexistente; `409` e-mail já usado por não-creator ou candidatura duplicada; `429` throttle. |

Candidatura autenticada usa `POST /applications` (guard `INFLUENCER`) — contrato pertence à
spec `applications-pipeline`, não duplicado aqui.

## UI Behavior
- `/influencer/browse` (autenticado): card só navega, nunca abre modal.
- `/programs` (público): mesmo componente de listagem; o link de cada card muda conforme há ou
  não sessão de creator no momento (autenticado → detalhe; anônimo → apply público).
- `/influencer/programs/:id` (autenticado): oferta, prazo, vagas, nichos, descrição. Três
  desfechos possíveis pro CTA: já tem candidatura → status + link pra ela (sem reabrir form);
  campanha não `ACTIVE` e sem candidatura → "Inscrições encerradas", sem CTA; caso contrário →
  botão que abre o modal de candidatura autenticada.
- `/apply/:id` (público, sem layout compartilhado): formulário com handle do Instagram,
  e-mail, nome opcional e mensagem opcional.

## Acceptance Criteria
- [x] Candidatura pública a campanha inexistente ou não-`ACTIVE` é recusada e nenhuma conta ou
      candidatura é criada.
- [x] E-mail já usado por conta que não é de creator é recusado; nenhuma conta é criada ou
      alterada.
- [x] Candidatura duplicada (mesma pessoa, mesma campanha) é recusada; não cria uma segunda
      `Application`.
- [x] Duas candidaturas públicas concorrentes com o mesmo handle nunca produzem duas contas nem
      erro de servidor — a segunda reaproveita a conta criada pela primeira.
- [x] Duas candidaturas públicas concorrentes com o mesmo e-mail (handles diferentes) têm a
      mesma garantia acima.
- [x] Reaplicar com conta ainda não reivindicada reemite e reenvia o link de definição de senha.
- [x] Reaplicar com conta já reivindicada **não** reemite nem reenvia o link.
- [x] Candidatura pública não espera a busca de dados do Instagram responder para retornar.
- [x] Falha ao montar ou enviar o link de definição de senha (incluindo configuração de
      ambiente ausente) **não** impede a criação da candidatura.
- [x] Falha ao emitir o link de definição de senha não impede a busca de dados do Instagram de
      ser disparada — os dois efeitos colaterais são independentes entre si.
- [x] Falha ao gravar a própria candidatura continua propagando como erro.
- [ ] Conta de creator existente sem handle de Instagram tem o handle preenchido ao se
      candidatar por este fluxo — comportamento implementado, sem teste dedicado (ver Known Gaps).

## Error Scenarios
- Campanha inexistente → `404` (candidatura autenticada) / recusa `400` explicitando o motivo
  (candidatura pública, mesma mensagem para "não existe" e "não está ativa" — não distingue os
  dois casos pro cliente).
- E-mail pertencente a conta que não é de creator → `409`, sem detalhar de quem é a conta.
- Candidatura duplicada → `409`.
- Mais de 5 tentativas de candidatura pública por IP em 60s → `429`.

## Known Gaps
(O gap "sem teste de frontend para `PublicApplyPage`" foi **fechado em 2026-08-23** — a
superfície de maior risco da capacidade, única sem guard e que cria conta, passou a ter
cobertura. Ver Test Coverage.)
- **Branch "preenche o handle de uma conta existente sem handle" sem teste dedicado** —
  implementado (`creators.service.ts`, dentro de `findOrCreateInfluencer`), mas nenhum dos
  specs existentes exercita esse caminho especificamente.
- Nenhuma tela de detalhe pública própria existe: `/apply/:id` cumpre esse papel também pro
  visitante anônimo. Não é gap — é a decisão de escopo registrada em `roadmap.md`.

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.race.spec.ts` —
  [x] campanha inexistente → 404, [x] campanha não-`ACTIVE` → 400, [x] e-mail usado por conta
  de marca → 409, [x] candidatura duplicada → 409, [x] colisão concorrente por handle (RC-1,
  reaproveita registro), [x] colisão concorrente por e-mail (RC-2, reaproveita registro),
  [x] guarda de N+1 (≤1 query por tabela em `applyPublic`).
- `apps/api/src/modules/creators/application/creators.service.claim.spec.ts` —
  [x] conta nova grava token de claim e envia e-mail com o link, [x] reapply sem claim reemite
  e reenvia, [x] reapply já claimado não reemite nem reenvia.
- Frontend: `BrowseProgramsPage.spec.tsx`, `ProgramsList.spec.tsx`, `ProgramCard.spec.tsx`,
  `ProgramDetailPage.spec.tsx`, `ApplyModal.spec.tsx`, `BrowseProgramsPublicPage.spec.tsx`.
- `apps/web/src/pages/public/PublicApplyPage.spec.tsx` —
  [x] carga da campanha (oferta + marca), [x] campanha inexistente mostra "programa não
  encontrado", [x] `DRAFT`/`CLOSED`/`COMPLETED` não mostram formulário, [x] payload enviado à
  rota pública, [x] normalização de `@` e caixa alta antes do envio, [x] confirmação na própria
  placa sem navegar, [x] handle e e-mail inválidos barrados antes da API, [x] respostas
  `409` (com e sem mensagem usável), `429` e `500`, [x] formulário continua disponível pra nova
  tentativa após erro.
- [ ] Branch de preenchimento de handle em conta existente — não existe teste dedicado.

## Current Implementation
- `CreatorsService.applyPublic` → `findOrCreateInfluencer` (resolve por
  `instagramHandle` `@unique`, depois por `email` `@unique` do `User`) → cria `Application`.
- Colisão concorrente é tratada capturando `PrismaClientKnownRequestError` código `P2002` e
  rebuscando via `findExistingInfluencer` em vez de deixar vazar `500`.
- Criação de conta nova: `bcrypt.hash(randomUUID())` como senha, token de claim gerado por
  `randomBytes(32)` com hash SHA-256 persistido (`claimTokenHash`) e o token cru só no e-mail.
- Envio do e-mail de claim é `await`ado antes de retornar (não é fire-and-forget), mas passa por
  `offerAccountClaim`/`sendClaimEmailBestEffort`, que capturam qualquer falha e apenas logam. A
  busca de dados do Instagram roda via `InstagramSyncService.scheduleRefresh` (`setImmediate`),
  fora do ciclo da resposta HTTP.
- `hrefBuilder` em `ProgramsList`/`BrowseProgramsPublicPage` decide o destino do card lendo o
  estado de auth do Zustand store no momento do render.

## Change History
- 2026-08-24 · **bug de produção corrigido**: a 1ª candidatura de toda creator nova respondia
  `500` e só a 2ª passava. `FRONTEND_URL` estava ausente no Railway; o `getOrThrow` que monta o
  link do claim rodava DEPOIS de `user.create` já ter commitado a conta e ANTES de
  `application.create`, então a conta nascia sem candidatura e sem busca de Instagram agendada.
  Reproduzido na produção antes e depois da correção da variável (`500` → `201` na 1ª
  tentativa). Regra 10 de Behavior e os critérios novos existem para que a causa estrutural
  (efeito colateral acessório com poder de derrubar a conversão) não volte por outro caminho.
- 2026-08-21 · retrofit inicial a partir do código em produção (v0.36.0+, branch
  `feature/commission-offer-and-deadline-validation` incluída na leitura do
  `campaigns.service.ts`).
- 2026-08-21 · reestruturado pro padrão SDD. Correção de conteúdo: a versão anterior
  reportava "não existe teste cobrindo `applyPublic` fora do cenário de corrida" — falso;
  `creators.service.race.spec.ts` já cobre validações sequenciais (404/400/409) e
  `creators.service.claim.spec.ts` cobre o caminho de emissão/reemissão de claim. O gap real e
  específico é mais estreito: só o branch de preenchimento de handle numa conta existente.
- 2026-08-23 · `PublicApplyPage` ganhou cobertura de teste (15 casos): contrato de envio,
  normalização do handle e as quatro respostas de erro da API. Era a única tela do produto sem
  guard nenhum e sem teste.
