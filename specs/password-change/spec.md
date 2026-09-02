---
slug: password-change
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-02
implements:
  - apps/api/src/modules/auth/presentation/auth.controller.ts (POST /auth/change-password)
  - apps/api/src/modules/auth/application/auth.service.ts (changePassword)
  - apps/api/src/modules/auth/application/dtos/change-password.dto.ts
  - apps/web/src/components/account/AccountSection.tsx
  - apps/web/src/components/account/ChangePasswordModal.tsx
related_decisions: []
---

# Trocar senha logada

## Objective
Primeiro item do Bloco 1 de LGPD (`.claude/knowledge/roadmap.md`) e o mais urgente por ser
segurança antes de LGPD: até esta capacidade, uma senha vazada não tinha como ser trocada —
`POST /auth/claim` só define senha na primeira vez, e não existia nenhum "trocar senha" pra
quem já está logada. `origin: FEATURE`: o veredito equivalente ao `AGORA` já estava registrado
em `roadmap.md` (bloco LGPD, item "Trocar senha logada", marcado como o mais urgente dos três) e
em `CLAUDE.md` → Pendente.

## Scope
Troca de senha por uma conta já autenticada (`BRAND` ou `INFLUENCER`), com verificação da senha
atual antes de aceitar a nova.

## Out of Scope
- Recuperação de senha sem estar logada — ver `password-reset` (prova identidade via token de
  e-mail, não via senha atual).
- Primeira definição de senha de conta CLAIMABLE — ver `account-claim`.
- Trocar e-mail — ver `email-change` (capacidade própria, 2026-09-02).
- 2FA, lista/revogação seletiva de sessões, histórico de senhas usadas.

## Domain
Reaproveita os campos já existentes em `User` (`password`, `resetTokenHash`/
`resetTokenExpiresAt`, `claimTokenHash`/`claimTokenExpiresAt`, `refreshTokenHash`) — nenhum
campo novo. `refreshTokenHash` é único por conta (não por dispositivo): reemitir sessão depois
da troca sobrescreve esse hash, e é isso que derruba qualquer outro dispositivo logado.

## Behavior
1. Exige a senha **atual** (`bcrypt.compare`) — ao contrário do reset, aqui a identidade já foi
   provada pelo JWT, então a senha atual é a segunda prova exigida antes de uma ação sensível
   (barra sessão desatendida/token roubado virando troca de senha silenciosa).
2. Nova senha igual à atual → rejeitada (`400`) — evita a troca que a pessoa acha que fez e não
   fez.
3. Sucesso: grava o hash novo, **zera o par de reset** (`resetTokenHash`/`resetTokenExpiresAt`)
   e **zera o par de claim** (`claimTokenHash`/`claimTokenExpiresAt`) — trocar a senha
   conscientemente encerra qualquer link de recuperação ou de claim ainda pendente pra essa
   conta.
4. Reemite a sessão (mesmo `buildAuthResponse` do login/claim/reset) — rotaciona
   `refreshTokenHash`, então qualquer OUTRO dispositivo com refresh token antigo perde a sessão
   na próxima tentativa de `/auth/refresh`. Comportamento pretendido, não efeito colateral.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| POST | `/auth/change-password` | `JwtAuthGuard`, throttle de `/auth/*` | `currentPassword` (≤72), `newPassword` (8–72). `200 { accessToken, user }` + cookie httpOnly de refresh, ou `401`/`400`. |

Throttle estrito (`AUTH_THROTTLE`, 5/15min) e não o global: o endpoint roda `bcrypt.compare`
(custo 12) a cada tentativa — sem throttle, uma sessão com access token válido vira um oráculo de
força-bruta barato contra a senha atual.

## UI Behavior
Seção "Conta" nas duas telas de Perfil (`AccountSection`), no lugar do antigo bloco só-leitura
de e-mail. Row "Senha" (valor sempre `••••••••`) abre `ChangePasswordModal` — mesmo shell visual
do `KineticEditField` (placa clara + `KineticActions`), mas **sem `<form>`**: o modal vive
aninhado dentro do `<form>` de Perfil, e um `<form>` aninhado é HTML inválido. O primário chama
`handleSubmit(onSubmit)` via `onClick`, igual ao "Salvar" do `KineticEditField`. Erro mantém o
modal aberto pra retry (mesmo padrão do `WithdrawModal`/`ResetPasswordPage`); sucesso mostra
confirmação inline com um botão "Fechar" explícito (ação sensível — não fecha sozinho). A seção
Conta fica **fora** do estado do form de perfil: abrir/fechar o modal não habilita o "Salvar" da
página (regressão coberta em teste).

## Acceptance Criteria
- [x] Senha atual incorreta não altera nada (`401`, sem `update` no banco).
- [x] Nova senha igual à atual é rejeitada (`400`), sem `update`.
- [x] Troca bem-sucedida zera os pares de reset e de claim no mesmo `update`.
- [x] Troca bem-sucedida rotaciona `refreshTokenHash` — outro dispositivo perde a sessão.
- [x] A sessão atual continua válida, com token novo (auto-login).
- [x] Abrir/cancelar o modal não habilita o botão "Salvar" do perfil.

## Error Scenarios
- `401` senha atual incorreta.
- `401` conta inexistente ou desativada.
- `400` nova senha igual à atual.
- `429` excesso de tentativas pelo mesmo IP (throttle de `/auth/*`).

## Known Gaps
- Sem 2FA, sem lista/revogação seletiva de sessões (o modelo só guarda um `refreshTokenHash` por
  conta — "derrubar todo mundo" é a única opção, não "derrubar só o dispositivo X").
- Sem e-mail de aviso ("sua senha foi alterada") — poderia ser um `sendBestEffort` a mais no
  `EmailService`, mesmo padrão do reset; não construído nesta v1 por não ter sido pedido.
- Sem histórico de senhas usadas (não impede reaproveitar uma senha antiga).

## Test Coverage
- `apps/api/src/modules/auth/application/auth.service.spec.ts` → `describe('changePassword')`
  — `- [x]` sucesso grava hash (nunca texto puro), `- [x]` zera os pares de reset e de claim,
  `- [x]` rotaciona `refreshTokenHash`, `- [x]` senha atual incorreta, `- [x]` usuário
  inexistente, `- [x]` conta desativada, `- [x]` nova senha igual à atual.
- `apps/api/src/modules/auth/presentation/auth.controller.throttle.spec.ts` — `- [x]`
  `changePassword` carrega `AUTH_THROTTLE`.
- `apps/api/src/modules/auth/presentation/auth.controller.guards.spec.ts` (novo) — `- [x]`
  `changePassword`/`logout` exigem `JwtAuthGuard` — regressão nova pra regra inviolável de guard
  em toda rota autenticada, que antes não tinha rede nenhuma.
- `apps/api/src/shared/validation/dto-maxlength.spec.ts` → `describe('ChangePasswordDto')` —
  `- [x]` limites de 72 chars nos dois campos, `- [x]` mínimo de 8 na nova senha.
- `apps/web/src/components/account/ChangePasswordModal.spec.tsx` — `- [x]` validação client-side
  dos dois campos, `- [x]` sucesso grava sessão nova + confirmação, `- [x]` 401/400/429/sem-conexão,
  `- [x]` Cancelar fecha sem chamar a API, `- [x]` `autoComplete` correto nos dois campos.
- `apps/web/src/pages/{brand,influencer}/ProfilePage.spec.tsx` — `- [x]` row "Senha" existe e
  abre o modal, `- [x]` abrir/cancelar o modal não habilita o "Salvar" do perfil.

## Current Implementation
- Reaproveita `AuthService.buildAuthResponse` (privado) pra reemitir sessão — é por isso que
  trocar senha e trocar e-mail (futuro `password-email`) vivem no módulo `auth`, não num módulo
  `account` à parte.
- `AccountSection`/`ChangePasswordModal` em `apps/web/src/components/account/` — pasta nova,
  ponto de extensão pro próximo item do Bloco 1 (trocar e-mail).

## Change History
- 2026-09-02 · Known Gap sobre `resetPassword` não zerar o par de claim foi **fechado** — ver
  `specs/password-reset` → Change History. Os dois fluxos de troca de senha (autenticado e por
  e-mail) agora encerram um claim pendente do mesmo jeito.
- 2026-09-02 · implementação inicial — endpoint, service, seção "Conta" no Perfil (marca e
  creator), modal de troca de senha, guard de regressão novo (`auth.controller.guards.spec.ts`).
