---
slug: campaign-lifecycle
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-31
implements:
  - apps/api/prisma/schema.prisma (model Campaign, enum CampaignStatus, enum OfferType)
  - apps/api/src/modules/campaigns/presentation/campaigns.controller.ts
  - apps/api/src/modules/campaigns/application/campaigns.service.ts
  - apps/api/src/modules/campaigns/application/dtos/create-campaign.dto.ts
  - apps/api/src/modules/campaigns/application/dtos/update-campaign.dto.ts
  - apps/web/src/pages/brand/NewCampaignPage.tsx
  - apps/web/src/pages/brand/EditCampaignPage.tsx
  - apps/web/src/pages/brand/campaignFormSchema.ts
  - apps/web/src/pages/brand/CampaignDetailPage.tsx (CampaignHeader)
related_decisions: [D-05]
---

# Campaign lifecycle

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. `Campaign` é a entidade central do produto: a marca publica uma oferta e a
creator se candidata a ela (ver `applications-pipeline`). A regra de que a oferta (`offer*`) é
definida **antes** de qualquer candidatura, e é a fonte de verdade do que a creator recebe, é
`D-05` — mata negociação constrangedora e leilão de preço; é o diferencial nº4 do produto.

## Scope
Ciclo de vida completo de uma campanha: criação, publicação, edição, encerramento e exclusão,
incluindo os campos de oferta (`offer*`) e a visibilidade pública/privada por status.

## Out of Scope
- Candidaturas a uma campanha e sua máquina de estados própria — ver `applications-pipeline`.
- Revisão de candidaturas via UI (Fila) — ver `campaign-fila-review`.
- Recompensas emitidas ao final da parceria — ver `rewards`.

## Domain
- `Campaign` pertence a um `Brand` (`brandId`, obrigatório).
- Campos descritivos: `title`, `description` (ambos obrigatórios, texto livre), `briefUrl`
  (opcional), `niches: string[]` (sem mínimo — pode ficar vazio; nunca teve `@ArrayMinSize` no
  DTO, só o formulário barrava com zero selecionados até 2026-08-31).
- `maxSpots` — inteiro ≥ 1. Representa vagas para creators **aprovadas**, não o total de
  candidaturas recebidas (a contagem real de candidaturas é domínio de `applications-pipeline`).
- `deadline` — data pura opcional (sem componente de hora).
- Oferta (`offer*`, fonte de verdade — `D-05`):
  - `offerType: CASH | PRODUCT | COMMISSION` (`COMMISSION` é o mais recente dos três).
  - `offerAmount` — inteiro em **centavos**, relevante só quando `CASH`.
  - `offerDeadlineDays` — dias corridos após aprovação de conteúdo até pagamento/envio.
  - `offerDescription` — texto livre, relevante só quando `PRODUCT`.
  - `offerCommissionPercent` — número entre 0.01 e 100, relevante só quando `COMMISSION`.
  - `rewardType`/`rewardValue` — **DEPRECATED**: mantidos só por compatibilidade de schema com
    registros antigos; nenhum fluxo novo deve depender deles.

## Behavior

### Máquina de estados
`CampaignStatus`: `DRAFT → ACTIVE → CLOSED`. Toda transição é guardada por endpoint dedicado
(nunca uma flag booleana solta) e exige que o solicitante seja o dono da campanha; transição
inválida nunca falha silenciosamente.

| Transição | Quem pode | Pré-condição |
|---|---|---|
| (nasce) → `DRAFT` | dono | — |
| `DRAFT → ACTIVE` (publicar) | dono | status atual é `DRAFT` |
| `ACTIVE → CLOSED` (encerrar) | dono | status atual é `ACTIVE` |
| editar campos | dono | status atual é `DRAFT` |
| apagar | dono | status atual é `DRAFT` |

Não existe caminho de volta (`ACTIVE → DRAFT`) nem qualquer transição a partir de `CLOSED`.
`COMPLETED` existe no domínio mas nenhuma transição leva a ele — ver "Known Gaps".

### Regras de negócio
- `deadline` não pode estar no passado, avaliado no fuso horário de referência do produto
  (`America/Sao_Paulo`) — vale tanto na criação quanto na edição.
- Uma campanha não-`ACTIVE` só é visível pro próprio dono; para qualquer outro visitante, o
  sistema se comporta como se ela não existisse (não distingue "não existe" de "existe mas não
  é sua").
- A listagem pública (`GET /campaigns`) só retorna campanhas `ACTIVE`.
- Toda visualização de campanha (lista e detalhe) é instrumentada para saber se o visitante
  está autenticado ou anônimo — é a única instrumentação de funil do produto hoje.
- **Todo campo de texto livre tem teto de tamanho**, recusado na validação de entrada antes de
  qualquer escrita no banco (regra geral de segurança do produto — defesa contra payload
  spam/DoS). Os tetos valem igualmente na criação e na edição:

| Campo | Teto |
|---|---|
| `title` | 100 caracteres |
| `description` | 2000 caracteres |
| `briefUrl` | 2048 caracteres |
| `offerDescription` | 500 caracteres |
| `niches[]` | 20 itens, 50 caracteres cada |
| `rewardValue` (deprecated) | 500 caracteres |

  O filtro `niches` da listagem pública (query string, não corpo) também tem teto (200
  caracteres) — é texto livre de origem anônima e sem ele a string é fatiada sem limite.

## API / Interfaces

Controller `campaigns`, prefixo `/api/v1`.

| Método | Rota | Guard / Role | Descrição |
|---|---|---|---|
| POST | `/campaigns` | `BRAND` | Cria campanha (nasce `DRAFT`) |
| GET | `/campaigns` | público (viewer opcional) | Lista `ACTIVE`, paginado, filtro por nicho |
| GET | `/campaigns/mine` | `BRAND` | Lista campanhas do dono, com contagem de aprovadas/pendentes |
| GET | `/campaigns/:id` | público (viewer opcional) | Detalhe — 404 se não-`ACTIVE` e viewer não é dono |
| PATCH | `/campaigns/:id` | `BRAND`, dono | Edita campos — só `DRAFT` |
| PATCH | `/campaigns/:id/publish` | `BRAND`, dono | `DRAFT → ACTIVE` |
| PATCH | `/campaigns/:id/close` | `BRAND`, dono | `ACTIVE → CLOSED` |
| DELETE | `/campaigns/:id` | `BRAND`, dono | Remove — só `DRAFT`, `204` sem corpo |

`GET /campaigns/mine` é declarado antes de `GET /campaigns/:id` no controller — rota literal
precisa vir antes de rota parametrizada, senão "mine" seria interpretado como `:id`.

## UI Behavior
`CampaignHeader` (dentro de `CampaignDetailPage`) deriva as ações visíveis do `status` da
campanha:
- `DRAFT`: "Publicar campanha" · "Editar" (abre `/brand/campaigns/:id/edit`) · "Apagar rascunho" —
  os três abaixo do título, como texto.
- `ACTIVE`: só "Encerrar campanha" — botão de verdade (borda, não texto sublinhado) no canto
  superior direito, acima do contador de vagas.
- `CLOSED` / `COMPLETED`: nenhuma ação — estado terminal. Em vez da ação, uma tag (borda, mono,
  sem preenchimento — mesma linguagem dos botões do sistema) com o status (`campaignStatusWord`)
  aparece ao lado do título, pra a tela não ficar muda sobre por que não há mais o que fazer ali.

`EditCampaignPage` reusa o mesmo formulário de `NewCampaignPage`; fora de `DRAFT`, a tela não
tenta submeter — mostra o motivo em vez de deixar a API recusar.

O formulário também rejeita `deadline` no passado **no cliente**, antes de chamar a API (erro
em pt-BR inline, no lugar do balão nativo do `<input type="date">`, que não é estilizável e sai
em inglês em boa parte dos browsers). Essa checagem cliente e a checagem de servidor (ver
"Regras de negócio") devem concordar sobre o que é "hoje" — ver "Known Gaps": hoje elas usam
fusos horários diferentes.

## Acceptance Criteria
- [x] Criar campanha com `deadline` no passado retorna erro e nenhuma campanha é criada.
- [x] Publicar uma campanha que não está em `DRAFT` retorna erro; status não muda.
- [x] Encerrar uma campanha que não está em `ACTIVE` retorna erro; status não muda.
- [x] Editar ou apagar uma campanha fora de `DRAFT` retorna erro; nada é alterado.
- [x] Uma campanha não-`ACTIVE` é invisível (404) para qualquer visitante que não seja o dono.
- [x] `GET /campaigns` nunca retorna campanha fora de `ACTIVE`.
- [x] `GET /campaigns/mine` traz `approvedCount`/`pendingCount` corretos por campanha,
      calculados sem uma query por campanha (2 queries totais).
- [x] Toda transição de status tem teste de unidade cobrindo o caminho de sucesso e o de
      rejeição — `publish`, `close` e `remove` (sucesso, pré-condição violada, não-dono).
- [x] Texto livre acima do teto é recusado na validação de entrada, com a campanha **não
      criada** — vale para criação e edição (o DTO de edição herda as mesmas restrições).
- [x] A checagem de "`deadline` não pode estar no passado" do formulário concorda com a da API
      pra qualquer fuso horário de navegador — as duas fixam "hoje" em `America/Sao_Paulo`.
      Coberto por `campaignFormSchema.spec.ts` com `TZ=UTC` na janela em que os fusos
      discordam de dia.

## Error Scenarios
- Criar/editar com `deadline` no passado → `400`, "Deadline cannot be in the past".
- Publicar/editar/encerrar/apagar campanha que não pertence ao usuário → `403`.
- Qualquer operação sobre `id` inexistente → `404`.
- Publicar campanha fora de `DRAFT` → `400`, "Only draft campaigns can be published" (mensagem
  análoga para editar/encerrar/apagar, trocando o verbo).
- Criar campanha sem perfil de marca associado ao usuário → `403`.

## Known Gaps
- **`CampaignStatus.COMPLETED` é inalcançável.** Existe no enum e aparece (sempre zerado) em
  contadores de dashboard, mas nenhum código escreve essa transição. Não é bug — é lacuna de
  modelo conhecida, documentada também em `CLAUDE.md` → "Dívida de modelo de dados".
(Dois gaps desta seção foram **fechados em 2026-08-23** — ausência de `@MaxLength` nos campos
de texto livre e ausência de teste em `close()`/`remove()`. O descompasso de fuso entre
formulário e API foi corrigido em 2026-08-22. Ver Change History.)

## Test Coverage
Arquivo: `apps/api/src/modules/campaigns/application/campaigns.service.spec.ts`.
- [x] `findAll` — paginação, log anônimo/autenticado.
- [x] `findOne` — 404 uniforme pra não-dono em `DRAFT`/`CLOSED`/inexistente, log.
- [x] `publish` — transição válida, `400` se não-`DRAFT`, `403` se não-dono.
- [x] `create` — aceita/rejeita `deadline` passado, aceita sem `deadline`,
      `offerCommissionPercent` passa adiante.
- [x] `update` — rejeita `deadline` passado, aceita `deadline` futuro.
- [x] `findMine` — `approvedCount`/`pendingCount`, `403` sem perfil de marca.
- [x] `close` — transição válida, `400` se não-`ACTIVE`, `403` se não-dono, `404` inexistente.
- [x] `remove` — apaga `DRAFT`, `400` se fora de `DRAFT` (e **nada é apagado**), `403` se
      não-dono.
- [x] Tetos de tamanho dos campos de texto livre — `create-campaign.dto.spec.ts` valida o DTO
      real via `class-validator` (aceita no limite, recusa acima; cobre também o DTO de edição,
      que herda as restrições via `PartialType`).

## Current Implementation
- Módulo em `apps/api/src/modules/campaigns/` (Clean Architecture: `presentation/` controller,
  `application/` service + DTOs).
- `assertDeadlineNotPast` (privado em `CampaignsService`) compara a data como **string**
  `yyyy-MM-dd` contra "hoje" calculado via `Intl.DateTimeFormat` no fuso `America/Sao_Paulo` —
  evita o off-by-one de converter para `Date` e comparar contra UTC do servidor perto da virada
  do dia.
- `create()` ainda escreve um default em `rewardType`/`rewardValue` (`'MONETARY'`/`''`) por
  compatibilidade de schema — não é uso ativo, é obrigação de coluna não-nula legada.
- `findMine`: `Prisma.groupBy([campaignId, status])` + `findMany` em `Promise.all` (não
  `$transaction` — são duas leituras independentes, sem check-then-act) evita N+1.
- `EditCampaignPage`/`NewCampaignPage` compartilham `CampaignForm`; conversores centavos↔R$ e
  ISO↔`yyyy-MM-dd` centralizados em `campaignFormSchema.ts`.
- `campaignFormSchema.ts` → `todayStr()`: calcula "hoje" a partir de `new Date()` e dos getters
  locais (`getFullYear`/`getMonth`/`getDate`) — fuso do navegador, não fixo. Comparação de
  `deadline` como string `yyyy-MM-dd` (ordena igual lexicograficamente) via `zod` `.refine()`,
  não via atributo `min` nativo do `<input type="date">`.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção (branch
  `feature/commission-offer-and-deadline-validation`, que introduziu `OfferType.COMMISSION`,
  `offerCommissionPercent` e a validação de deadline passado — ainda não mergeada em
  `develop`/`main` no momento deste retrofit).
- 2026-08-21 · reestruturado pro padrão SDD (Objective/Scope/Out of Scope/Domain/Behavior/API
  interfaces/UI Behavior/Acceptance Criteria/Error Scenarios/Known Gaps/Test Coverage/Current
  Implementation) — sem mudança de comportamento, só reclassificação e adição de critérios
  verificáveis.
- 2026-08-21 · `/review` achou e registrou o descompasso de fuso horário entre a validação de
  `deadline` do formulário e da API (novo Known Gap + critério de aceitação `[ ]` + item em
  `CLAUDE.md` → "Bugs conhecidos"). Não corrigido nesta entrada, só documentado.
- 2026-08-22 · descompasso de fuso **corrigido** (PR #126): `todayStr()` do formulário passou a
  usar `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`, idêntico ao backend.
  Coberto por `campaignFormSchema.spec.ts`, que força `TZ=UTC` e um instante às 02:00 UTC
  (= 23:00 do dia anterior em São Paulo) — sem esse setup o teste passa mesmo com o bug, que é
  como ele escapou (a máquina de dev roda em São Paulo, então as duas pontas concordavam por
  acidente). Known Gap e item de `CLAUDE.md` removidos.
- 2026-08-23 · `@MaxLength`/`@ArrayMaxSize` aplicados a todo campo de texto livre de
  `CreateCampaignDto` (e, por herança, do de edição) e ao filtro `niches` da listagem —
  fechando a contradição com a regra de segurança geral do projeto. Novos tetos registrados em
  "Behavior". Teste de DTO novo.
- 2026-08-23 · `close()` e `remove()` ganharam teste de unidade (sucesso, pré-condição violada,
  não-dono, inexistente). Fecha o último `[ ]` de "toda transição tem teste".
- 2026-08-30 · terminologia de produto: "programa" passou a ser "campanha" em toda a copy visível (rótulos, botões, mensagens de erro, placeholders). Sem mudança de comportamento, rota, endpoint ou modelo de dados — só texto.
- 2026-08-31 · `CampaignHeader` reposicionado, a pedido do Pedro. "Encerrar campanha" (`ACTIVE`)
  virou botão de verdade (borda) no canto superior direito, acima do contador de vagas — antes
  era texto sublinhado embaixo do título. `CLOSED`/`COMPLETED` ganharam uma tag de status
  (borda, mesma linguagem visual) ao lado do título, ocupando o espaço que a ação ocuparia — a
  primeira versão usou `StatusWord` (palavra solta, sem borda) e foi trocada por feedback visual
  direto do Pedro ("não gostei do texto ao lado, melhora o visual"). Sem mudança de comportamento
  de domínio, só layout.
- 2026-08-31 · nicho deixou de ser obrigatório ao criar/editar campanha, a pedido do Pedro. O
  backend nunca exigiu (`CreateCampaignDto.niches` não tem `@ArrayMinSize`, sempre aceitou `[]`)
  — a barreira era só o `.min(1)` do `campaignFormSchema`, removido, junto do asterisco de
  "obrigatório" ao lado do rótulo "Nichos". Toda tela que exibe nichos de campanha já era
  condicional a `niches.length > 0`, então nenhuma tela quebra com o campo vazio.
