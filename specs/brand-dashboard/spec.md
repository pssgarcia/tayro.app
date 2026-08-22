---
slug: brand-dashboard
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/dashboard/application/dashboard.service.ts
  - apps/api/src/modules/dashboard/presentation/dashboard.controller.ts
  - apps/web/src/pages/brand/DashboardPage.tsx
related_decisions: []
---

# Dashboard da marca

## Objective
Retrofit — sem processo `/feature` original registrado. Home da marca (`/brand`): responde "o
que precisa da minha atenção agora" sem exigir que ela navegue manualmente por cada campanha.

## Scope
Agregação de leitura, em um único request, de contagens por status de campanhas, candidaturas,
conteúdos pendentes de revisão e recompensas — tudo pertencente à marca autenticada.

## Out of Scope
Esta capacidade não tem modelo, máquina de estados nem regra de negócio própria — não define
quando uma candidatura fica `PENDING` ou um reward fica `ISSUED` (isso é `applications-pipeline`
e `rewards`). Mudar o que o dashboard *mostra* é editar esta spec; mudar as regras que produzem
os números é editar a spec da capacidade dona.

## Domain
Sem entidade própria. Lê `Campaign` (`campaign-lifecycle`), `Application`
(`applications-pipeline`), `ContentSubmission` (`content-submissions`) e `Reward` (`rewards`),
todas escopadas por `brandId` do usuário autenticado.

## Behavior
Todas as agregações rodam numa única transação com 4 queries fixas — número de queries não
cresce com volume de dados (sem N+1 mesmo com centenas de campanhas).

## API / Interfaces

| Método | Rota | Role |
|---|---|---|
| GET | `/brand/dashboard` | BRAND |

Shape da resposta:
```
{
  campaigns:    { total, active, draft, closed, completed },
  applications: { total, pending, approved, rejected },
  content:      { pendingReview },
  rewards:      { total, pending, issued, delivered },
}
```

## UI Behavior
- `campaigns.total === 0` → estado "Comece por aqui": placa com CTA "Criar o primeiro" →
  `/brand/campaigns/new`. Tem prioridade sobre o card de atenção abaixo.
- Senão, `applications.pending > 0` → placa "Precisa de você" com o número de candidaturas
  pendentes e CTA "Analisar agora" → `/brand/campaigns`. Único sinal que vira placa de destaque
  — `content.pendingReview` e `rewards.pending` **não** geram placa própria, aparecem só como
  número no bloco "Resumo" (decisão deliberada: 3 cards âmbar iguais viravam ruído, 1 placa só
  pro mais urgente cria hierarquia).
- "Resumo": 4 blocos de estatística (programas · candidaturas · conteúdos a revisar ·
  recompensas), cada um com sublabel derivado (ex.: "N ativos", "N fechadas", "N entregues").

## Acceptance Criteria
- [x] Usuário sem perfil de marca recebe erro ao acessar o dashboard.
- [x] Todas as contagens são zero quando a marca não tem nenhum dado.
- [x] O número de queries executadas não varia com o volume de campanhas/candidaturas.
- [x] `campaigns.total === 0` sempre mostra o estado "Comece por aqui", independente de outros
      valores.

## Error Scenarios
- Usuário autenticado sem perfil de marca → `403`.

## Known Gaps
Nenhum conhecido nesta capacidade — os gaps reais (ex.: `CampaignStatus.COMPLETED`
inalcançável, refletido aqui só como contador sempre zerado) pertencem à spec de origem do dado
(`campaign-lifecycle`), não a este agregador.

## Test Coverage
Backend: `apps/api/src/modules/dashboard/application/dashboard.service.spec.ts`.
- [x] `403` sem perfil de brand.
- [x] Agregação de campanhas/candidaturas/recompensas por status.
- [x] Contagem de conteúdo pendente.
- [x] Zeros quando a brand não tem dado nenhum.
- [x] Teto fixo de queries (sem N+1 independente do volume).

Frontend: `apps/web/src/pages/brand/DashboardPage.spec.tsx` — existe (confirmado por Glob); não
lido linha a linha neste retrofit — se for tocar a tela, confirmar que os 3 estados
(vazio/atenção/resumo) estão de fato cobertos antes de assumir que sim.

## Current Implementation
- Módulo em `apps/api/src/modules/dashboard/`.
- As 4 agregações (`campaign.groupBy`, `application.groupBy`, `contentSubmission.count`,
  `reward.groupBy`) rodam dentro de `prisma.$transaction([...])` — contagem feita pelo Postgres,
  nunca iterando campanhas na aplicação.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0.
- 2026-08-21 · reestruturado pro padrão SDD (Objective/Scope/Out of Scope/Domain/Behavior/API
  interfaces/UI Behavior/Acceptance Criteria/Error Scenarios/Known Gaps/Test Coverage/Current
  Implementation) — sem mudança de comportamento. Spec mantida proporcionalmente pequena:
  capacidade sem máquina de estados própria não precisa de todas as seções infladas.
