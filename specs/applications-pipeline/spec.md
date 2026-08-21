---
slug: applications-pipeline
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/prisma/schema.prisma (model Application, enum ApplicationStatus)
  - apps/api/src/modules/applications/presentation/applications.controller.ts
  - apps/api/src/modules/applications/application/applications.service.ts
  - apps/api/src/modules/applications/application/dtos/create-application.dto.ts
  - apps/web/src/pages/influencer/MyApplicationsPage.tsx (WithdrawModal)
related_decisions: [D-01]
---

# Applications pipeline

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. `Application` é o vínculo entre uma creator (`Influencer`) e uma `Campaign`
— o núcleo do CRM, já que avaliar candidata é a dor central do produto (`D-01`).

## Scope
Ciclo de vida de uma candidatura: criar, aprovar, rejeitar, retirar, e o disparo de atualização
manual dos dados de Instagram da creator a partir de uma candidatura.

## Out of Scope
- Interface de revisão (desktop Pipeline / mobile Story) — ver `campaign-fila-review`. Esta spec
  cobre só o backend e a UI de retirar candidatura (lado creator).
- Comportamento do provider de Instagram (retry, staleness, fallback) — ver `instagram-sync`.
- Ciclo de vida da própria `Campaign` (`DRAFT`/`ACTIVE`/`CLOSED`) — ver `campaign-lifecycle`.
- Registro de resultado da parceria (`PartnershipResult`) — ver "Known Gaps": existe no schema
  mas nenhum código deste módulo (nem de nenhum outro) escreve nele.

## Domain
- `Application` liga `Campaign` + `Influencer`. Campos: `message` (opcional, mensagem da
  creator ao candidatar), `appliedAt`, `reviewedAt` (setado só quando aprovada ou rejeitada —
  **não** no withdraw).
- `@@unique([campaignId, influencerId])` — uma creator só pode ter **uma** application por
  campanha, **independente do status atual**. Isso vale mesmo depois de `WITHDRAWN`: a unique
  constraint não distingue "nunca aplicou" de "aplicou e retirou".

## Behavior

### Máquina de estados
`ApplicationStatus`: `PENDING → APPROVED | REJECTED | WITHDRAWN`. Toda transição sai de
`PENDING`; nenhuma é reversível — não há caminho de volta a partir de `APPROVED`, `REJECTED` ou
`WITHDRAWN`.

| Transição | Quem | Pré-condição |
|---|---|---|
| (nasce) → `PENDING` | `INFLUENCER` | campanha `ACTIVE`; vagas aprovadas < `maxSpots`; sem application prévia pra esta campanha (qualquer status) |
| `PENDING → APPROVED` | `BRAND` dona da campanha | status atual `PENDING`; ainda há vaga disponível no momento da aprovação |
| `PENDING → REJECTED` | `BRAND` dona da campanha | status atual `PENDING` |
| `PENDING → WITHDRAWN` | `INFLUENCER` dona da application | status atual `PENDING` |

### Regras de negócio
- **`maxSpots` conta só candidaturas `APPROVED`**, nunca o total de applications — vale tanto
  na criação (rejeita se `count(APPROVED) >= maxSpots`) quanto na aprovação.
- **Duas aprovações concorrentes não podem, juntas, ultrapassar `maxSpots`.** Se a última vaga
  for disputada por dois approves simultâneos, exatamente um deve ter sucesso; o outro recebe o
  mesmo erro "campanha cheia" que teria fora de concorrência (não um erro técnico de banco).
- **Envio de e-mail de decisão (aprovação/rejeição) é best-effort:** uma falha ao enviar o
  e-mail não desfaz nem impede a transição de status, que já foi persistida antes do envio.
- **Retirar candidatura (`withdraw`) é definitivo.** Não existe transição de volta a `PENDING`
  nem qualquer forma de reaplicar à mesma campanha depois (efeito direto da unique constraint
  acima) — ver "Known Gaps".
- **Atualização manual de Instagram tem cooldown independente do resultado anterior.** Uma
  tentativa que falhou (`igFetchStatus=FAILED`) conta pro cooldown exatamente como uma que teve
  sucesso — cada tentativa consome cota de uma API externa paga por uso. Default: 15 minutos
  (configurável). Fora do cooldown, a chamada é rejeitada e informa quantos minutos faltam.
  Comportamento do que a busca em si faz (retry, staleness, fallback de campo) é de
  `instagram-sync` — aqui só o gatilho e o cooldown.

## API / Interfaces

Controller `applications`, prefixo `/api/v1`, todas as rotas atrás de `JwtAuthGuard`.

| Método | Rota | Role | Descrição |
|---|---|---|---|
| POST | `/applications` | `INFLUENCER` | Cria candidatura (`PENDING`) |
| GET | `/applications/mine` | `INFLUENCER` | Lista candidaturas do próprio influencer |
| GET | `/applications/campaign/:campaignId` | `BRAND`, dona | Lista candidaturas de uma campanha |
| PATCH | `/applications/:id/approve` | `BRAND`, dona da campanha | `PENDING → APPROVED` |
| PATCH | `/applications/:id/reject` | `BRAND`, dona da campanha | `PENDING → REJECTED` |
| PATCH | `/applications/:id/withdraw` | `INFLUENCER`, dona | `PENDING → WITHDRAWN` |
| PATCH | `/applications/:id/refresh-ig` | `BRAND`, dona da campanha | Dispara atualização de IG, sujeito a cooldown; throttle adicional de 3 chamadas/5min por IP |

## UI Behavior
Toda linha `PENDING` em `MyApplicationsPage` (não só a candidatura em destaque) tem ação
"Retirar", que abre `WithdrawModal`. O modal **explica a consequência** (definitivo, sem
reaplicar) em vez de perguntar "tem certeza?", e fica aberto em caso de erro pra permitir retry
— existe porque a versão anterior disparava o withdraw num único clique, sem aviso.

## Acceptance Criteria
- [x] Candidatar-se a uma campanha não-`ACTIVE` retorna erro; nenhuma `Application` é criada.
- [x] Candidatar-se quando `maxSpots` já foi atingido por candidaturas `APPROVED` retorna erro.
- [x] Candidatar-se novamente à mesma campanha (qualquer status anterior, inclusive
      `WITHDRAWN`) retorna `409`; nenhuma nova `Application` é criada.
- [x] Aprovar/rejeitar uma candidatura que não está `PENDING` retorna erro; status não muda.
- [x] Aprovar/rejeitar uma candidatura de campanha que não pertence ao solicitante retorna `403`.
- [x] Duas aprovações concorrentes na última vaga da campanha: no máximo uma tem sucesso.
- [x] Falha ao enviar e-mail de decisão não desfaz a aprovação/rejeição já persistida.
- [x] Retirar candidatura fora de `PENDING` retorna erro.
- [x] Atualizar IG dentro do cooldown retorna `429` com os minutos restantes, mesmo que a
      última tentativa tenha sido `FAILED`.
- [ ] Existe alguma forma de reverter um `WITHDRAWN` indevido (ver Known Gaps — não existe hoje).

## Error Scenarios
- Candidatar campanha inexistente → `404`.
- Candidatar campanha não-`ACTIVE` → `400`, "Campaign is not accepting applications".
- Candidatar campanha cheia → `400`, "Campaign is full".
- Candidatar campanha já aplicada (qualquer status) → `409`, "Already applied to this campaign".
- Aprovar/rejeitar/retirar fora de `PENDING` → `400`.
- Aprovar/rejeitar/atualizar IG de candidatura de campanha alheia → `403`, "Not your campaign".
- Retirar candidatura alheia → `403`, "Not your application".
- Atualizar IG dentro do cooldown → `429`, corpo com `waitMinutes`.
- Ação sobre `id` de candidatura inexistente → `404`.

## Known Gaps
- **Não existe forma de reverter `WITHDRAWN`.** Como a unique constraint `(campaignId,
  influencerId)` não distingue status, uma creator que retira por engano fica **permanentemente**
  impedida de reaplicar àquela campanha. Não há decisão de produto registrada sobre isso em
  `decisions.md` — é mitigado só com um aviso forte no `WithdrawModal` antes da ação, não com
  uma forma de desfazer depois. Tratar como decisão pendente, não como comportamento definitivo
  aceito.
- **`PartnershipResult`** (relação 1:1 opcional com `Application` no schema) não é escrito por
  nenhum código do produto — faz parte do escopo ainda não implementado de "histórico
  verificado" (`decisions.md` D-D, `ABERTA`).

## Test Coverage
Arquivo: `apps/api/src/modules/applications/application/applications.service.race.spec.ts`.
- [x] `create()` — sucesso, campanha cheia, campanha não-`ACTIVE`, já aplicado (`409`).
- [x] `approve()` — transição válida, `403` se não-dono, `400` se não-`PENDING`, cenário de
      concorrência (`P2034` → `400`).
- [x] `reject()` — transição válida + guardas de dono/status.
- [x] `findByCampaign()` — shape da resposta (influencer + contagem de submissions).
- [ ] `withdraw()` — sem teste de unidade dedicado.
- [ ] `refreshInfluencerIg()` — sem teste de unidade dedicado (cooldown, `429`, `waitMinutes`).

## Current Implementation
- Módulo em `apps/api/src/modules/applications/` (Clean Architecture).
- Concorrência em `approve()`: `prisma.$transaction` com
  `isolationLevel: Serializable` — conta `APPROVED` e faz o `update` na mesma transação; o
  Postgres aborta a transação perdedora com `P2034`, que o service traduz pro mesmo `400
  Campaign is full` do caminho não-concorrente (a creator nunca vê erro técnico de banco).
  `create()` fecha a corrida equivalente via `@unique` (`P2002` → `409`).
  `message` do DTO de criação tem `@MaxLength(1000)`.
- Cooldown de refresh de IG lido via `ConfigService` (`IG_REFRESH_COOLDOWN_MINUTES`, default
  `'15'`), comparado contra `influencer.igFetchedAt` (carimbado em toda tentativa, sucesso ou
  falha — mecanismo completo descrito em `instagram-sync`).
- `influencerSelect` (shape compartilhado de campos de IG) usado em `findByCampaign` e no
  retorno de `refreshInfluencerIg`, pra manter o mesmo contrato de resposta.
- `useWithdrawApplication` é o hook que chama `PATCH /applications/:id/withdraw`.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD. Mudança conceitual: "sem rota pra desfazer
  WITHDRAWN" estava classificado como "fora de escopo deliberado" — reclassificado pra `Known
  Gaps`, porque não há evidência (código, teste ou entrada em `decisions.md`) de que isso foi
  uma decisão consciente, só uma consequência não endereçada.
