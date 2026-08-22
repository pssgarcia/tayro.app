---
slug: rewards
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/rewards/presentation/rewards.controller.ts
  - apps/api/src/modules/rewards/application/rewards.service.ts
  - apps/api/src/modules/rewards/application/dtos/create-reward.dto.ts
  - apps/web/src/pages/brand/CampaignRewardsTab.tsx
  - apps/web/src/pages/influencer/RewardsPage.tsx
related_decisions: [D-05, D-07, D-08]
---

# Recompensas (Reward)

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. Fecha o ciclo da parceria: depois que a oferta (`D-05`, `offer*` em
`Campaign` — ver `campaign-lifecycle`) foi combinada e a candidatura aprovada, a marca precisa
registrar que cumpriu o combinado e a creator precisa ver que vai receber.

## Scope
Registro, emissão e confirmação de entrega de uma recompensa concedida a uma creator com
candidatura aprovada numa campanha.

## Out of Scope
- Pagamento automático / movimentação real de dinheiro — `D-07` (PIX manual no MVP). Este
  módulo só registra estado, não integra gateway nem move valor.
- Notificação automática à creator quando o status muda — `D-08` (fora do MVP).
- Exigir conteúdo aprovado antes de emitir recompensa — **não é regra hoje** (ver "Behavior");
  já foi assim no passado e falhou silencioso em produção, corrigido antes deste retrofit.

## Domain
`Reward` pertence a um `Influencer` (`influencerId`) e a uma `Campaign` (`campaignId`).
- `type`: enum `RewardType` — `MONETARY | PRODUCT | DISCOUNT`. Este enum é compartilhado com o
  campo legado `Campaign.rewardType` (deprecado — ver `campaign-lifecycle`), mas em `Reward` ele
  segue sendo a fonte de verdade ativa do tipo de recompensa.
- `value`: **string livre** (ex.: `"R$300"`), texto descritivo — não um valor numérico
  calculável. Ver "Known Gaps": isto quebra a convenção geral de dinheiro do produto.
- `notes`: opcional, até 500 caracteres.

## Behavior

### Máquina de estados
`RewardStatus`: `PENDING → ISSUED → DELIVERED`, linear, sem pular etapa. Só a `BRAND` dona da
campanha aciona qualquer transição.

### Regra de criação
Registrar uma recompensa exige (a) a campanha pertencer à marca autenticada e (b) existir uma
`Application` do influencer nessa campanha com status `APPROVED`. **Não exige** conteúdo
aprovado (`ContentSubmission`) — só candidatura aprovada.

## API / Interfaces

Controller `rewards`, prefixo `/api/v1`, atrás de `JwtAuthGuard`.

| Método | Rota | Role | Observação |
|---|---|---|---|
| POST | `/rewards` | BRAND | cria em `PENDING`, ver "Regra de criação" |
| GET | `/rewards/campaign/:campaignId` | BRAND | lista da campanha, com dados do influencer |
| GET | `/rewards/mine` | INFLUENCER | lista do próprio influencer, com título da campanha e marca |
| PATCH | `/rewards/:id/issue` | BRAND | `PENDING → ISSUED`, carimba `issuedAt` |
| PATCH | `/rewards/:id/deliver` | BRAND | `ISSUED → DELIVERED` |

## UI Behavior
`CampaignRewardsTab` (marca): modal de registro de recompensa por candidatura aprovada; ações
de emitir/entregar disponíveis conforme o status atual. `RewardsPage` (creator): lista das
próprias recompensas com tipo, valor, status e data de emissão.

## Acceptance Criteria
- [x] Registrar recompensa pra influencer sem candidatura aprovada na campanha retorna erro;
      nenhuma `Reward` é criada.
- [x] Registrar recompensa numa campanha que não pertence à marca autenticada retorna erro.
- [x] Registrar recompensa não exige conteúdo aprovado — só candidatura `APPROVED`.
- [x] Marcar como emitida (`issue`) uma recompensa que não está `PENDING` retorna erro; status
      não muda.
- [x] Marcar como entregue (`deliver`) uma recompensa que não está `ISSUED` retorna erro; status
      não muda.
- [x] `issuedAt` é preenchido no momento da emissão, não na criação.

## Error Scenarios
- `campaignId` inexistente → `404`.
- Campanha não pertence à marca autenticada → `403`, "Not your campaign".
- Influencer sem candidatura `APPROVED` na campanha → `400`, "Influencer does not have an
  approved application for this campaign".
- `issue` fora de `PENDING` → `400`, "Reward is already issued or delivered".
- `deliver` fora de `ISSUED` → `400`, "Reward must be issued before marking as delivered".

## Known Gaps
- **`Reward.value` é string livre, não inteiro em centavos.** Quebra a convenção de dinheiro do
  resto do produto (`Campaign.offerAmount` é `Int` em centavos). Aqui é texto descritivo da
  recompensa concedida (ex.: `"R$300"`, ou uma descrição de produto), não um valor operável —
  não dá pra somar/comparar programaticamente. Não corrigido neste retrofit, só documentado; uma
  migração pra estruturar isso (valor numérico + moeda/descrição separados) exigiria decisão de
  produto sobre o que fazer com registros antigos em texto livre.
- **`RewardsPage.tsx` (creator) não tem arquivo de teste** — confirmado por Glob.

## Test Coverage
Backend: `apps/api/src/modules/rewards/application/rewards.service.spec.ts`.
- [x] `create` — sucesso, sem candidatura aprovada → `400`, marca não-dona → `403`, campanha
      inexistente → `404`.
- [x] `markAsIssued` — `PENDING → ISSUED`, rejeita se já `ISSUED`.
- [x] `markAsDelivered` — `ISSUED → DELIVERED`, rejeita se ainda `PENDING`.

Frontend:
- [x] `apps/web/src/pages/brand/CampaignRewardsTab.spec.tsx` — existe.
- [ ] `apps/web/src/pages/influencer/RewardsPage.spec.tsx` — **não existe** (ver Known Gaps).

## Current Implementation
- Módulo em `apps/api/src/modules/rewards/` (Clean Architecture).
- Sem `@@index` no schema além da PK — consultas filtram por `campaignId`/`influencerId`, sem
  índice dedicado hoje.
- `findOwnedOrFail` resolve marca + reward + ownership em duas queries sequenciais (não
  `$transaction` — leitura pura, sem check-then-act de escrita concorrente).

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0.
- 2026-08-21 · reestruturado pro padrão SDD (Objective/Scope/Out of Scope/Domain/Behavior/API
  interfaces/UI Behavior/Acceptance Criteria/Error Scenarios/Known Gaps/Test Coverage/Current
  Implementation) — sem mudança de comportamento. Correção de precisão: `RewardsPage.spec.tsx`
  confirmado inexistente por Glob (antes descrito como "não lido em detalhe, confirmar
  cobertura"), agora registrado como lacuna real de teste.
