---
slug: content-submissions
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-23
implements:
  - apps/api/src/modules/content/presentation/content.controller.ts
  - apps/api/src/modules/content/application/content.service.ts
  - apps/api/src/modules/content/application/dtos/create-submission.dto.ts
  - apps/api/src/modules/content/application/dtos/review-submission.dto.ts
  - apps/web/src/pages/influencer/SubmissionsPage.tsx
  - apps/web/src/pages/brand/CampaignContentTab.tsx
related_decisions: []
---

# Conteúdos enviados (ContentSubmission)

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. Depois de aprovada numa campanha (ver `applications-pipeline`), a creator
precisa de um jeito de entregar o conteúdo combinado, e a marca precisa avaliar antes de liberar
recompensa — sem este gate, `rewards` não teria nenhum critério de "cumpriu o combinado".

## Scope
Envio de conteúdo por uma creator com candidatura aprovada, e revisão (aprovar / recusar /
pedir revisão) pela marca dona da campanha.

## Out of Scope
- Emissão e entrega de recompensa após aprovação do conteúdo — ver `rewards`.
- Re-submissão após `REVISION_REQUESTED`: não existe transição de estado para isso (ver
  "Behavior" abaixo) — é uma submission nova, sem vínculo com a anterior.

## Domain
`ContentSubmission` pertence a uma `Application` (`applicationId`). Campos: `mediaUrl`
(obrigatório), `mediaType` (`IMAGE | VIDEO | REEL | STORY`), `caption` (opcional), `status`,
`feedback` (opcional), `submittedAt`, `reviewedAt` (opcional). Rótulo de `mediaType` no
frontend: IMAGE→"Foto", VIDEO→"Vídeo", REEL→"Reel", STORY→"Story".

## Behavior

### Máquina de estados
`ContentStatus`: `PENDING → APPROVED | REJECTED | REVISION_REQUESTED`. Todas as três transições
saem só de `PENDING` — não há encadeamento (uma vez decidido, uma nova tentativa de revisar é
rejeitada). Só a `BRAND` dona da campanha pode revisar.

- **Aprovar / recusar:** `feedback` opcional em ambos.
- **Pedir revisão:** `feedback` **obrigatório e não-vazio** — é a única transição que valida
  conteúdo do corpo, porque sem motivo a creator não sabe o que corrigir.

### Regra de criação
Enviar conteúdo exige que a `Application` referenciada (a) exista, (b) pertença ao influencer
autenticado, e (c) esteja `APPROVED`. Candidatura pendente ou rejeitada não pode receber
conteúdo.

### Quem pode ver o quê
Além dos donos óbvios (creator vê o que ela mesma enviou; marca vê o que foi enviado pra sua
campanha), existe uma terceira via: consulta por `applicationId` é liberada tanto pra creator
dona da candidatura quanto pra marca dona da campanha — ver "API / Interfaces".

## API / Interfaces

Controller `submissions`, prefixo `/api/v1`, atrás de `JwtAuthGuard`.

| Método | Rota | Role | Observação |
|---|---|---|---|
| POST | `/submissions` | INFLUENCER | cria, ver "Regra de criação" |
| GET | `/submissions/mine` | INFLUENCER | conteúdos do próprio influencer, com título da campanha e nome da marca |
| GET | `/submissions/campaign/:campaignId` | BRAND | todos os conteúdos da campanha (dona confirmada) |
| GET | `/submissions/application/:applicationId` | brand dona OU influencer dono (checado no service, sem `@Roles`) | ver "Known Gaps" — sem consumidor no frontend |
| PATCH | `/submissions/:id/approve` | BRAND | `PENDING → APPROVED` |
| PATCH | `/submissions/:id/reject` | BRAND | `PENDING → REJECTED` |
| PATCH | `/submissions/:id/request-revision` | BRAND | `PENDING → REVISION_REQUESTED`, feedback obrigatório |

## UI Behavior
`CampaignContentTab` (marca): ação de aprovar/recusar/pedir revisão só aparece em conteúdo
`PENDING`; conteúdo `APPROVED`/`REJECTED`/`REVISION_REQUESTED` não mostra ação. Pedir revisão
abre modal que exige o texto de feedback antes de submeter. Lista filtrável por status.
`SubmissionsPage` (creator): lista os próprios envios com status e o feedback da marca quando
existir.

## Acceptance Criteria
- [x] Enviar conteúdo pra candidatura que não está `APPROVED` retorna erro; nenhuma submission
      é criada.
- [x] Enviar conteúdo pra candidatura de outro influencer retorna erro.
- [x] Aprovar/recusar/pedir revisão de conteúdo que não está `PENDING` retorna erro; status não
      muda.
- [x] Pedir revisão sem feedback (ausente ou só espaço em branco) retorna erro; status não muda.
- [x] Aprovar ou recusar sem feedback é aceito — só "pedir revisão" exige o campo.
- [x] Marca que não é dona da campanha não consegue revisar conteúdo dela.
- [ ] Consulta por `applicationId` (`GET /submissions/application/:applicationId`) tem um
      consumidor real no produto (ver Known Gaps — hoje não tem).

## Error Scenarios
- `applicationId` inexistente (criar ou consultar) → `404`.
- Candidatura não pertence ao influencer autenticado → `403`.
- Candidatura ainda não `APPROVED` → `400`, "Your application must be approved before
  submitting content".
- Revisar (`approve`/`reject`/`request-revision`) submissão que não está `PENDING` → `400`,
  "Submission is not pending".
- `request-revision` sem feedback → `400`, "Feedback is required when requesting revision".
- Marca que não é dona da campanha tenta revisar → `403`, "Not your campaign".

(A foto da creator nesta tela passou a ser a do Instagram em 2026-08-23 — antes lia só
`avatarUrl`, campo manual que na prática está sempre vazio, e por isso mostrava iniciais para
praticamente todo mundo. Ver `instagram-sync` → "Identidade visual da creator".)

## Known Gaps
- **`GET /submissions/application/:applicationId` não tem consumidor no frontend** — confirmado
  por grep, nenhum arquivo em `apps/web` chama esta rota. Endpoint funciona e é testado
  indiretamente pela ownership dupla, mas está morto no produto hoje.
- **Revisão de conteúdo escreve sem filtrar por status.** `approve`, `reject` e
  `requestRevision` verificam `PENDING` na leitura e depois atualizam por `id` apenas. Duas
  revisões concorrentes (dois usuários da mesma marca, ou retry de requisição cujo timeout
  venceu) resolvem em "a última escrita vence", sem erro. É a mesma classe de defeito corrigida
  em `applications-pipeline` em 2026-08-23 — aqui **não** foi corrigido: mudaria o contrato de
  erro da API (novo `409`) e por isso precisa entrar como pedido de mudança próprio, não como
  efeito colateral de uma release de robustez. Consequência hoje é menor que na candidatura
  (sem e-mail e sem vaga em jogo), mas o histórico de revisão fica inconsistente.
- **Assimetria de validação entre `reject` e `request-revision`** (recusar não exige motivo,
  pedir revisão exige) é comportamento atual deliberado (documentado acima em "Behavior"), não
  um gap — registrado aqui só pra não ser confundido com inconsistência acidental por quem ler
  rápido.

## Test Coverage
Backend: `apps/api/src/modules/content/application/content.service.spec.ts`.
- [x] `findByCampaign` — retorno com influencer, `404` campanha inexistente, `403` não-dono,
      lista vazia, teto de 2 queries (sem N+1).
Backend (revisão e envio): `apps/api/src/modules/content/application/content.service.review.spec.ts`.
- [x] `submit` — cria com candidatura `APPROVED`; recusa em `PENDING`/`REJECTED`/`WITHDRAWN`
      sem criar nada; `403` candidatura de outra creator; `403` sem perfil de creator; `404`
      candidatura inexistente.
- [x] `findMine` — filtra pela própria creator, ordena por envio mais recente, traz
      campanha/marca na mesma query, `403` sem perfil.
- [x] `findByApplication` — ownership dupla (creator dona **e** marca dona enxergam), `403`
      pra terceiro, `404` inexistente.
- [x] `approve`/`reject` — transição a partir de `PENDING` com carimbo de revisão, `403`
      não-dono, `400` em conteúdo já revisado (nos 3 estados terminais), `404` inexistente.
- [x] `requestRevision` — exige feedback (recusa `undefined`, `''` e só espaços sem escrever
      nada), checa posse antes do feedback, transição válida.

Frontend: `apps/web/src/pages/brand/CampaignContentTab.spec.tsx`.
- [x] Empty state, card por tipo de mídia, botões de ação só em `PENDING`, ausência de ação em
      `APPROVED`, modal de revisão exige feedback, filtro por status.
- [x] `SubmissionsPage.tsx` (creator) — estados de carga/erro/vazio, cascata da placa em
      destaque (ajuste pedido > aprovado > só em análise), modal de envio (abre por botão e por
      `?apply=`, só lista candidaturas `APPROVED`, explica quando não há nenhuma), validação de
      URL e de candidatura antes da API, e as respostas `400`/`403`/genérica.

## Current Implementation
- Módulo em `apps/api/src/modules/content/` (Clean Architecture).
- `mediaUrl` validado como URL (`@IsUrl`) no DTO; `caption` limitado a 2200 caracteres;
  `feedback` (em `ReviewSubmissionDto`) limitado a 1000 caracteres.
- `findByCampaign` inclui `influencer` selecionado (id/nome/handle/avatar) numa única query com
  `include`, remapeado em memória — não é uma query por submission.
- `findByApplication` resolve ownership dupla via dois `include` (`campaign.brand` e
  `influencer`) numa única leitura, comparando `userId` contra os dois lados.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0.
- 2026-08-21 · reestruturado pro padrão SDD (Objective/Scope/Out of Scope/Domain/Behavior/API
  interfaces/UI Behavior/Acceptance Criteria/Error Scenarios/Known Gaps/Test Coverage/Current
  Implementation) — sem mudança de comportamento. Correção de precisão: `SubmissionsPage.tsx`
  (creator) confirmado sem arquivo de teste (antes descrito como "não lido em detalhe", agora
  verificado por Glob e registrado como lacuna real).
- 2026-08-23 · cobertura de teste do serviço passou de 1 método (`findByCampaign`) para os 7:
  novo `content.service.review.spec.ts` com o gate de candidatura aprovada, a ownership dupla e
  os três caminhos de revisão. Registrado também um Known Gap novo, achado ao escrever os
  testes: a revisão escreve sem filtrar por status (mesma classe do que foi corrigido em
  `applications-pipeline` no mesmo dia), deliberadamente não corrigido aqui.
