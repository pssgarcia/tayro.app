---
slug: email-change
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-02
implements:
  - apps/api/src/modules/auth/presentation/auth.controller.ts (POST /auth/change-email)
  - apps/api/src/modules/auth/application/auth.service.ts (changeEmail)
  - apps/api/src/modules/auth/application/dtos/change-email.dto.ts
  - apps/api/src/modules/email/email.service.ts (sendEmailChanged)
  - apps/web/src/components/account/AccountSection.tsx
  - apps/web/src/components/account/ChangeEmailModal.tsx
related_decisions: []
---

# Trocar e-mail logado

## Objective
Segundo item do Bloco 1 de LGPD (`.claude/knowledge/roadmap.md`), na sequência de
`password-change`. Antes desta capacidade, `email` não aparecia em nenhum DTO de update — quem
digitou o e-mail errado no cadastro, ou quer trocar por qualquer motivo, ficava travado pra
sempre. É correção de dado pessoal (LGPD art. 18 III). `origin: FEATURE`: o veredito equivalente
ao `AGORA` já estava registrado em `roadmap.md` (bloco LGPD, item 1) e nos Known Gaps de
`brand-account`/`creator-account`.

## Scope
Troca de e-mail por uma conta já autenticada (`BRAND` ou `INFLUENCER`), com verificação da senha
atual antes de aceitar o novo endereço, e aviso ao endereço antigo.

## Out of Scope
- Dupla confirmação por link enviado ao e-mail NOVO antes da troca valer — decisão desta v1 é
  troca imediata (ver Known Gaps, gatilho de revisão).
- Normalização de e-mail (lowercase/trim) — nada no `login`/`register*` normaliza hoje;
  introduzir só aqui criaria inconsistência entre fluxos.
- Verificação de posse do e-mail novo (confirmar que a pessoa tem acesso à caixa de entrada) —
  consequência de não ter dupla confirmação.
- Primeira definição de e-mail — isso é `brand-account`/`creator-account` (cadastro).

## Domain
Reaproveita `User.email` (já `@unique`) — nenhum campo novo. Compartilha o padrão de "prova de
identidade via senha atual" com `password-change`.

## Behavior
1. Exige a senha **atual** (`bcrypt.compare`) — mesma prova de identidade do `changePassword`.
2. E-mail novo igual ao atual → rejeitado (`400`).
3. **Sem check-then-act**: a constraint `@unique` do banco é a única fonte de verdade — mesmo
   padrão de `registerBrand`/`registerInfluencer`. Conflito vira `409` com `field: 'email'`
   (mesmo shape de erro do cadastro, pra marcar o campo certo no front).
4. Sucesso: grava o e-mail novo, zera o par de reset (link em voo foi pro endereço antigo).
5. Avisa o e-mail **antigo** da troca (best-effort — falha do envio nunca desfaz a troca já
   gravada).
6. Reemite a sessão — o access token carrega `email` no payload (`jwt-access.strategy.ts`), sem
   reemitir o front mostraria o e-mail velho até o token expirar.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| POST | `/auth/change-email` | `JwtAuthGuard`, throttle de `/auth/*` | `email`, `password` (≤72). `200 { accessToken, user }` + cookie httpOnly de refresh, ou `401`/`400`/`409`. |

Throttle estrito (`AUTH_THROTTLE`) pelo mesmo motivo do `password-change`: o endpoint roda
`bcrypt.compare` a cada tentativa.

## UI Behavior
Row "E-mail" na seção "Conta" (`AccountSection`, compartilhada com `password-change`) — antes
só-leitura, agora abre `ChangeEmailModal` (campo novo e-mail pré-preenchido com o atual + senha
atual). Erro `409` aparece **inline no campo de e-mail** (usa o `field` do corpo do erro, mesmo
padrão de `RegisterInfluencerPage`), não como mensagem genérica. Demais erros (401/400/429/sem
conexão) em mensagem genérica, mesmo padrão do `ChangePasswordModal`. Sucesso invalida os dois
query keys de perfil (`brandProfileKeys.me` e `influencerProfileKeys.me`) — o componente não sabe
qual papel é o usuário logado, então invalida os dois; só o que existir de verdade recarrega.

## Acceptance Criteria
- [x] Senha incorreta não altera nada (`401`, sem `update` no banco).
- [x] E-mail novo igual ao atual é rejeitado (`400`), sem `update`.
- [x] E-mail já em uso retorna `409` com `field: 'email'`, sem check-then-act.
- [x] Troca bem-sucedida zera o par de reset e reemite sessão com o e-mail novo no token.
- [x] Aviso da troca vai pro e-mail ANTIGO, nunca pro novo.
- [x] Falha no envio do aviso não desfaz a troca (best-effort).
- [x] Row "E-mail" abre o modal com o valor atual pré-preenchido.
- [x] Abrir/cancelar o modal não habilita o "Salvar" do perfil.

## Error Scenarios
- `401` senha incorreta.
- `401` conta inexistente ou desativada.
- `400` e-mail igual ao atual.
- `409` e-mail já em uso (`field: 'email'`).
- `429` excesso de tentativas pelo mesmo IP.

## Known Gaps
- **Sem dupla confirmação por link no e-mail novo** — decisão desta v1 (imediata + senha atual +
  aviso ao antigo), adequada a 0 usuários pagantes hoje. Um typo não tranca ninguém — a pessoa
  continua logada e troca de novo. Revisar se houver conta paga/tração real.
- **Sem normalização de e-mail** (lowercase/trim) — mesmo padrão (ausência) do resto do fluxo de
  auth; gap compartilhado, não específico desta capacidade.
- **Sem verificação de posse do e-mail novo** — consequência direta de não ter dupla confirmação.

## Test Coverage
- `apps/api/src/modules/auth/application/auth.service.spec.ts` → `describe('changeEmail')` —
  `- [x]` sucesso grava e-mail + zera par de reset, `- [x]` token assinado com e-mail novo,
  `- [x]` rotaciona `refreshTokenHash`, `- [x]` aviso vai pro e-mail antigo, `- [x]` senha
  incorreta, `- [x]` e-mail já em uso (`P2002`→409), `- [x]` erro não-P2002 propaga, `- [x]`
  e-mail igual ao atual, `- [x]` conta desativada, `- [x]` falha do aviso não derruba a troca.
- `apps/api/src/modules/auth/presentation/auth.controller.throttle.spec.ts` — `- [x]`
  `changeEmail` carrega `AUTH_THROTTLE`.
- `apps/api/src/modules/auth/presentation/auth.controller.guards.spec.ts` — `- [x]` `changeEmail`
  exige `JwtAuthGuard`.
- `apps/api/src/modules/email/email.service.spec.ts` — `- [x]` `sendEmailChanged` cita o novo
  endereço, manda pro destinatário certo.
- `apps/api/src/shared/validation/dto-maxlength.spec.ts` → `describe('ChangeEmailDto')` —
  `- [x]` limites de e-mail e senha.
- `apps/web/src/components/account/ChangeEmailModal.spec.tsx` — `- [x]` pré-preenchimento,
  validação client-side, sucesso grava sessão + invalida cache, `409` inline no campo,
  `- [x]` 401/400/429/sem-conexão, `- [x]` Cancelar fecha sem chamar a API.
- `apps/web/src/pages/{brand,influencer}/ProfilePage.spec.tsx` — `- [x]` row "E-mail" clicável e
  pré-preenche o modal, `- [x]` abrir/cancelar não habilita o "Salvar" do perfil.

## Current Implementation
- Mesmo módulo `auth` de `password-change` (reaproveita `buildAuthResponse` privado).
- `ChangeEmailModal` usa `useQueryClient` real (não mockado) pra invalidar
  `brandProfileKeys.me`/`influencerProfileKeys.me` — testes de `ProfilePage` precisaram de um
  `QueryClientProvider` real na árvore (os hooks de dado continuam mockados).
- Mesmo shell sem `<form>` do `ChangePasswordModal` (aninhado dentro do form de Perfil).

## Change History
- 2026-09-02 · implementação inicial — endpoint, service, `sendEmailChanged`, row "E-mail"
  interativa na seção "Conta".
