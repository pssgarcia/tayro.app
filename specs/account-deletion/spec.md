---
slug: account-deletion
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-04
implements:
  - apps/api/src/modules/auth/presentation/auth.controller.ts (POST /auth/delete-account)
  - apps/api/src/modules/creators/application/creators.service.ts (deleteMyAccount)
  - apps/api/src/modules/creators/application/dtos/delete-account.dto.ts
  - apps/api/src/modules/email/email.service.ts (sendAccountDeleted)
  - apps/web/src/components/account/AccountSection.tsx
  - apps/web/src/components/account/DeleteAccountModal.tsx
  - apps/web/src/services/api.ts (interceptor de 401)
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
| POST | `/auth/delete-account` | `JwtAuthGuard`, `RolesGuard` (`INFLUENCER`), throttle de credenciais (`AUTH_THROTTLE`, 5/15min) | Body `{ password }`. `204 No Content` + cookie de refresh apagado, ou `401`/`403`/`429`. |

Throttle estrito pelo mesmo motivo de `changePassword`/`changeEmail`: o endpoint roda
`bcrypt.compare` a cada tentativa.

**Por que vive em `/auth/*` e não em `/influencers/*`:** o interceptor de resposta do frontend
(`api.ts`) trata qualquer `401` fora de `/auth/*` como "token expirado numa rota protegida" e
chama `clearAuth()` — é a regra que evita ficar preso numa sessão morta em qualquer outra tela.
Mas o `401` deste endpoint significa "senha atual incorreta" (erro de negócio, prova de
identidade), não token expirado. Servido em `/influencers/me` (1ª tentativa desta capacidade,
2026-09-04), a creator que errava a senha era **deslogada** em vez de ver "Senha incorreta" — o
interceptor limpava a sessão antes do componente conseguir mostrar o erro. `changePassword`/
`changeEmail` já resolviam isso do mesmo jeito (vivendo em `/auth/*`); `CreatorsService` continua
dono da lógica de negócio (`deleteMyAccount`), só o `AuthController` expõe a rota, injetando
`CreatorsService` (exportado por `CreatorsModule`, importado por `AuthModule`).

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

## Behavior (complemento 2026-09-04)

### O hash da senha antiga é destruído
`isActive: false` já impede o login, mas o hash é material de credencial da pessoa: bcrypt é
lento, não inquebrável, e a senha dela provavelmente é reusada em outros serviços. A exclusão
grava no lugar um hash de valor aleatório e descartado.

Não é `null` nem string vazia: a coluna é obrigatória, e um valor que não é hash bcrypt válido
faria `bcrypt.compare` se comportar de forma imprevisível se algum caminho futuro chegasse ali.

### O registro de aceite dos documentos é PRESERVADO
`acceptedTermsVersion`, `acceptedPrivacyVersion`, `acceptedAt` e `declaredAdultAt` não são
tocados. São uma versão e dois horários, que não identificam a pessoa, e são a prova de que a
relação existiu sob determinado texto. Ver `specs/legal-acceptance` → Regra 6.

## Known Gaps
- Escopo só `INFLUENCER` — conta de marca não tem exclusão (decisão explícita da `D-22`, não
  esquecimento).
- **Texto livre com possível dado pessoal PERMANECE, e é decisão aberta do Pedro** (levantado na
  auditoria de 2026-09-04, não alterado sem decisão): `Application.message` (a mensagem que a
  própria creator escreveu sobre si na candidatura), `ContentSubmission.caption` e `mediaUrl` (a
  URL pode conter o nome dela), `Reward.notes` e `PartnershipResult.note` (escritos pela marca).
  Os quatro últimos são registro comercial da marca; o primeiro, `Application.message`, é o mais
  difícil de justificar — o que a marca precisa guardar é a DECISÃO, não o texto de venda da
  creator. Enquanto não for decidido, a Política precisa descrever a retenção como ela é.
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
- `apps/api/src/modules/auth/presentation/auth.controller.guards.spec.ts` — `- [x]`
  `deleteAccount` exige `JwtAuthGuard` e `RolesGuard`; os outros três métodos do controller
  (`changePassword`/`changeEmail`/`logout`) explicitamente NÃO carregam `RolesGuard`.
- `apps/api/src/modules/auth/presentation/auth.controller.throttle.spec.ts` — `- [x]`
  `deleteAccount` incluído no `it.each` de `AUTH_THROTTLE`.
- `apps/web/src/services/api.spec.ts` (novo) — `- [x]` `401` fora de `/auth/*` limpa a sessão,
  `- [x]` `401` em `/auth/*` NÃO limpa (é o caso que o bug expôs), `- [x]` outros códigos de erro
  fora de `/auth/*` não limpam.
- `apps/web/src/components/account/DeleteAccountModal.spec.tsx` (novo) — `- [x]` consequência
  aparece antes do campo, `- [x]` senha vazia bloqueia sem chamar a API, `- [x]` sucesso chama
  `POST /auth/delete-account`, limpa sessão e navega, `- [x]` 401/429/sem-conexão, `- [x]`
  Cancelar fecha sem chamar a API.
- `apps/web/src/components/account/AccountSection.spec.tsx` — `- [x]` row só aparece para
  `INFLUENCER`.
- `apps/web/src/pages/{brand,influencer}/ProfilePage.spec.tsx` — `- [x]` a row existe na tela da
  creator e está ausente na da marca.

## Current Implementation
- **Lógica de negócio e rota moram em módulos diferentes, de propósito.** `deleteMyAccount` vive
  em `CreatorsService` (é quem já sabe mexer em `Influencer`/`Application`/`IgImage`); a rota
  `POST /auth/delete-account` vive em `AuthController`, que injeta `CreatorsService`
  (`CreatorsModule` exporta, `AuthModule` importa — sem ciclo, nada importa `AuthModule`). Não é
  simetria por capricho: é a única forma de o `401` de senha incorreta cair sob `/auth/*` sem
  duplicar a lógica de exclusão dentro de `AuthService`.
- `igRecentPosts` (campo `Json?`) usa `Prisma.DbNull` para gravar SQL `NULL`, não
  `Prisma.JsonNull` (que gravaria o valor JSON `null` dentro da coluna).
- `AccountSection` ganhou `DeleteAccountModal` como terceiro modal condicional, seguindo o mesmo
  padrão de `ChangeEmailModal`/`ChangePasswordModal`.

## Change History
- 2026-09-04 · **fix, achado em teste manual do Pedro:** a 1ª versão expunha `DELETE
  /influencers/me`. Digitar a senha errada deslogava em vez de mostrar "Senha incorreta" — o
  interceptor de 401 do frontend (`api.ts`) trata `401` fora de `/auth/*` como sessão expirada.
  Movido para `POST /auth/delete-account` (mesma casa de `changePassword`/`changeEmail`, que já
  evitavam esse footgun). Regressão nova: `apps/web/src/services/api.spec.ts` (novo arquivo)
  testa o interceptor de verdade contra um adapter axios sintético — a suíte anterior só mockava
  `api.post`/`api.delete` diretamente, o que nunca exercitava o interceptor e não teria pego o
  bug.
- 2026-09-04 · implementação inicial — endpoint, transação de exclusão, e-mail de confirmação,
  row + modal de confirmação no frontend.
- 2026-09-04 · **hash da senha antiga passou a ser destruído** (achado na auditoria do mesmo dia):
  a versão anterior mantinha `User.password` intacto, confiando só em `isActive: false` para
  impedir o login. Agora a exclusão grava um hash de valor aleatório descartado. Teste novo
  valida por mutação. O registro de aceite dos documentos (`legal-acceptance`) é explicitamente
  preservado, com teste que falha se alguém passar a apagá-lo.
