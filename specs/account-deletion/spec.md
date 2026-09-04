---
slug: account-deletion
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-04
implements:
  - apps/api/src/modules/creators/presentation/influencers.controller.ts (DELETE /influencers/me)
  - apps/api/src/modules/creators/application/creators.service.ts (deleteMyAccount)
  - apps/api/src/modules/creators/application/dtos/delete-account.dto.ts
  - apps/api/src/modules/email/email.service.ts (sendAccountDeleted)
  - apps/web/src/components/account/AccountSection.tsx
  - apps/web/src/components/account/DeleteAccountModal.tsx
related_decisions: [D-22]
---

# Apagar conta (creator)

## Objective
Fecha o direito de eliminação (art. 18 VI da LGPD), bloqueado desde 2026-08-14 pela decisão
`ABERTA` `D-E` — apagar em cascata faria a marca perder o próprio comprovante de pagamento;
anonimizar tudo sem apagar nada contrariaria o pedido de exclusão de fato da creator. O Pedro
resolveu isso em 2026-09-03 como `D-22` (ver `decisions.md`): a identidade da pessoa apaga de
fato, o registro comercial da marca (sem PII) permanece. `origin: FEATURE`: esta spec nasce
diretamente da `D-22`, sem passar pelo `/feature` de novo — decisão de estratégia já ratificada.

## Scope
Exclusão, sob demanda, da conta de uma creator autenticada — identidade apagada de fato,
registro de trabalho/pagamento da marca preservado sem nenhuma informação que identifique a
pessoa.

## Out of Scope
- Conta de **marca** — não tem o mesmo argumento de vulnerabilidade que motivou a `D-22`; abrir
  isso é escopo novo, com pergunta própria sobre o que acontece com campanhas/creators
  aprovadas.
- Exclusão em cascata de qualquer registro ligado à marca (`Application`, `ContentSubmission`,
  `Reward`, `PartnershipResult`) — ver Domain.
- Prazo de retenção antes da eliminação definitiva (a `D-22` optou por eliminação imediata, sem
  janela de arrependimento — diferente de "desativar" ou "soft delete" temporário).
- Reversão — ver Behavior (irreversível por decisão, não por limitação técnica).

## Domain
`Application`, `ContentSubmission`, `Reward` e `PartnershipResult` **não são cascateados** na
exclusão: continuam existindo, com a FK (`influencerId`) intacta apontando para o `Influencer`
que teve os campos de identidade esvaziados (o `id` da linha nunca muda). A marca continua vendo
que houve uma parceria, uma recompensa emitida, um conteúdo entregue — sem nome, @ do Instagram,
foto, telefone nem qualquer outro dado pessoal.

`IgImage` (fotos cacheadas do Instagram, `D-18`) **é** apagado (`deleteMany`) — é dado pessoal de
terceiro sobre a creator, mantê-lo depois da exclusão contradiria o pedido.

## Behavior
1. Exige a senha atual antes de executar — mesma prova de identidade de `changePassword`/
   `changeEmail` (ver `password-change`/`email-change`).
2. Toda candidatura `PENDING` da creator vira `WITHDRAWN` — mesma semântica de retirar
   manualmente. `maxSpots` só conta `APPROVED`, então isso não libera nem consome vaga; só evita
   uma candidatura fantasma na Fila de uma conta que não existe mais.
3. Os campos de identidade do `Influencer` são esvaziados: `name` vira `"Conta excluída"`
   (campo obrigatório, não pode ser `null`), `avatarUrl`/`bio`/`phone`/`tiktokHandle`/
   `instagramHandle`/`igProfilePicUrl`/`igRecentPosts`/`igFetchedAt`/`igFetchStatus`/
   `followersCount`/`igEngagementRate`/`city` viram `null`, `niches` vira `[]`,
   `publicProfileEnabled` vira `false`. `instagramHandle` liberado permite recadastro futuro com
   o mesmo @ (constraint `@unique`).
4. O `User` recebe um e-mail tombstone único (`deleted-<uuid>@tayro.invalid`, libera o endereço
   real para recadastro), `isActive` vira `false` (mesmo campo que `login()` já checa — cinturão
   e suspensório além do e-mail trocado), e todos os pares de token
   (`refreshTokenHash`/`claimTokenHash`+`claimTokenExpiresAt`/`resetTokenHash`+
   `resetTokenExpiresAt`) são zerados.
5. Os quatro passos acima (retirar `PENDING`, apagar `IgImage`, esvaziar `Influencer`, tombstone
   em `User`) rodam numa única `$transaction` — tudo ou nada.
6. Best-effort, **fora** da transação: um e-mail de confirmação sai pro endereço **original**
   (capturado antes da transação rodar — depois dela, o único e-mail acessível é o tombstone,
   que ninguém lê).
7. Irreversível — sem link de recuperação, ao contrário de `WithdrawModal`/`DeleteCampaignModal`.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| DELETE | `/influencers/me` | `JwtAuthGuard`, `RolesGuard` (`INFLUENCER`), throttle de credenciais (`AUTH_THROTTLE`, 5/15min) | Body `{ password }`. `204 No Content` + cookie de refresh apagado, ou `401`/`403`/`429`. |

Throttle estrito pelo mesmo motivo de `changePassword`/`changeEmail`: o endpoint roda
`bcrypt.compare` a cada tentativa.

## UI Behavior
Row "Apagar minha conta" na seção "Conta" (`AccountSection`), visível **só** para `role ===
'INFLUENCER'`, com destaque visual de perigo (`text-destructive`). Abre `DeleteAccountModal` —
mesmo shell dos outros modais de Conta (placa clara + `KineticActions`, sem `<form>` aninhado).
A consequência aparece em texto **antes** do campo de senha (mesmo padrão do `WithdrawModal`):
"Seu perfil, foto, nichos e telefone são apagados. Candidaturas e recompensas continuam
existindo para as marcas, sem seu nome. Isso não pode ser desfeito." Sem checkbox extra — a
senha já é a fricção deliberada. Sucesso: limpa a sessão (`clearAuth`) e navega para `/`
(landing, não `/login` — não faz sentido convidar a entrar de novo numa conta que acabou de ser
apagada). Erro mantém a modal aberta pra retry.

## Acceptance Criteria
- [x] Senha incorreta devolve `401` e não altera nada no banco.
- [x] Conta sem perfil de creator devolve `403`.
- [x] Candidaturas `PENDING` viram `WITHDRAWN`; outros status não são tocados.
- [x] `IgImage` da creator é apagado.
- [x] Campos de identidade do `Influencer` são esvaziados, mantendo o `id` estável.
- [x] `User.email` vira um tombstone único; `isActive` vira `false`; todos os pares de token são
      zerados.
- [x] O e-mail de confirmação vai para o endereço **original**, não o tombstone.
- [x] A row "Apagar minha conta" aparece só para `INFLUENCER`.
- [x] Sucesso limpa a sessão local e navega para `/`.

## Error Scenarios
- `401` senha incorreta, ou conta inexistente/inativa.
- `403` conta autenticada sem perfil de creator (não deveria ser alcançável via guard de role,
  mesma defesa de `getMe`/`updateMe`).
- `429` excesso de tentativas (throttle de credenciais).
- Erro de rede no frontend → mensagem inline, modal permanece aberta.

## Known Gaps
- Escopo só `INFLUENCER` — conta de marca não tem exclusão (decisão explícita da `D-22`, não
  esquecimento).
- Sem período de carência/arrependimento — a exclusão é imediata e definitiva assim que a senha
  é confirmada.
- Comportamento de UI não coberto por teste automatizado: como `/brand/creators` e a Fila de uma
  campanha renderizam uma candidatura de conta já excluída (`name: "Conta excluída"`, campos
  `null`). Os componentes já tratam esses campos como opcionais hoje, mas nenhum teste passa um
  `Influencer` inteiramente esvaziado — verificar manualmente se algo aparecer torto.

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.delete-account.spec.ts` — `- [x]`
  senha incorreta (401, sem transação), `- [x]` conta inexistente/inativa (401), `- [x]` sem
  perfil de influencer (403), `- [x]` `PENDING`→`WITHDRAWN`, `- [x]` `IgImage` apagado, `- [x]`
  campos de identidade esvaziados (incluindo `Prisma.DbNull` em `igRecentPosts`), `- [x]`
  tombstone único + `isActive=false` + todos os tokens zerados, `- [x]` e-mail de confirmação
  usa os valores ORIGINAIS, capturados antes da transação.
- `apps/api/src/modules/creators/presentation/influencers.controller.guards.spec.ts` — `deleteMe`
  incluído no regressivo de `RolesGuard`.
- `apps/api/src/modules/creators/presentation/influencers.controller.throttle.spec.ts` (novo) —
  `- [x]` `deleteMe` carrega `AUTH_THROTTLE`, `- [x]` as demais rotas do controller não carregam.
- `apps/web/src/components/account/DeleteAccountModal.spec.tsx` (novo) — `- [x]` consequência
  aparece antes do campo, `- [x]` senha vazia bloqueia sem chamar a API, `- [x]` sucesso limpa
  sessão e navega, `- [x]` 401/429/sem-conexão, `- [x]` Cancelar fecha sem chamar a API.
- `apps/web/src/components/account/AccountSection.spec.tsx` — `- [x]` row só aparece para
  `INFLUENCER`.
- `apps/web/src/pages/{brand,influencer}/ProfilePage.spec.tsx` — `- [x]` a row existe na tela da
  creator e está ausente na da marca.

## Current Implementation
- `deleteMyAccount` vive em `CreatorsService` (não em `AuthService`, ao contrário de
  `changePassword`/`changeEmail`) — evita injeção cruzada entre `AuthModule` e `CreatorsModule`;
  `CreatorsService` já importa `PrismaService`/`EmailService`/`bcryptjs`. Decisão de
  implementação, não de comportamento (o `DeleteAccountDto` e a prova de senha são idênticos ao
  padrão do módulo `auth`).
- `igRecentPosts` (campo `Json?`) usa `Prisma.DbNull` para gravar SQL `NULL`, não
  `Prisma.JsonNull` (que gravaria o valor JSON `null` dentro da coluna).
- `AccountSection` ganhou `DeleteAccountModal` como terceiro modal condicional, seguindo o mesmo
  padrão de `ChangeEmailModal`/`ChangePasswordModal`.

## Change History
- 2026-09-04 · implementação inicial — endpoint, transação de exclusão, e-mail de confirmação,
  row + modal de confirmação no frontend.
