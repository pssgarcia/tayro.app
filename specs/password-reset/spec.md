---
slug: password-reset
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-02
implements:
  - apps/api/src/modules/auth/presentation/auth.controller.ts (POST /auth/forgot-password, POST /auth/reset-password)
  - apps/api/src/modules/auth/application/auth.service.ts (forgotPassword, resetPassword)
  - apps/api/src/modules/auth/application/dtos/forgot-password.dto.ts
  - apps/api/src/modules/auth/application/dtos/reset-password.dto.ts
  - apps/api/src/modules/email/email.service.ts (sendPasswordReset)
  - apps/web/src/pages/auth/ForgotPasswordPage.tsx
  - apps/web/src/pages/auth/ResetPasswordPage.tsx
  - apps/web/src/utils/redirectPath.ts
related_decisions: []
---

# Recuperação de senha

## Objective
`POST /auth/claim` define senha só uma vez, na criação de uma conta CLAIMABLE. Antes desta
capacidade, quem esquecia a senha (ou tinha ela vazada) ficava fora do produto pra sempre, sem
caminho de volta — item de segurança mais urgente do `CLAUDE.md` → Pendente e gate de
lançamento (`roadmap.md`, item 3.1). `origin: FEATURE`: o veredito equivalente ao `AGORA` do
`/feature` já estava registrado nesses dois arquivos ("segurança antes de LGPD", "o que falta
agora é só o `POST /auth/forgot-password` + tela") — este documento formaliza a decisão de
implementar.

## Scope
Emissão de token de recuperação por e-mail, consumo do token pra definir uma nova senha, e
auto-login no sucesso. Serve qualquer conta com senha usável (`BRAND` e `INFLUENCER`), inclusive
conta CLAIMABLE.

## Out of Scope
- Como a conta é criada e como o claim funciona — ver `account-claim`. Reset é um par
  independente de token (`resetTokenHash`/`resetTokenExpiresAt`), não reaproveita
  `claimTokenHash`/`claimTokenExpiresAt`.
- Trocar senha ou e-mail estando logada — não existe ainda (ver `CLAUDE.md` → Pendente, bloco
  LGPD).
- Preview de identidade antes do formulário — decisão deliberada de não ter, ver Known Gaps.
- Cooldown de emissão por e-mail além do throttle por IP — ver Known Gaps.

## Domain
Par `resetTokenHash`/`resetTokenExpiresAt` em `User`, separado de `claimTokenHash`/
`claimTokenExpiresAt` porque os dois fluxos podem estar em voo simultaneamente pra mesma conta
sem interferir um no outro (ex.: uma conta CLAIMABLE que também pede reset). Token bruto (32
bytes aleatórios, hex) só existe em trânsito na URL do e-mail; o banco guarda só o hash SHA-256
— mesmo padrão do claim e do refresh token. TTL fixo de 1 hora, mais curto que os 7 dias do
claim: quem pede reset está travado agora, não é um "venha quando quiser".

## Behavior
1. **Emissão** (`forgotPassword`) — busca conta ativa pelo e-mail. Se não existir, ou estiver
   `isActive: false`, não faz nada (nem grava token, nem manda e-mail) — mas o chamador nunca
   sabe disso: a resposta é sempre a mesma. Se existir: gera token, grava o par com expiração em
   1h, manda e-mail com o link. Envio é best-effort — falha do provedor nunca propaga.
2. **Consumo** (`resetPassword`) — token válido e não expirado: define a nova senha, zera o par
   `resetTokenHash`/`resetTokenExpiresAt` e autentica automaticamente (mesmo mecanismo de sessão
   do login/claim). Não toca em `claimTokenHash`/`claimTokenExpiresAt`.
3. **Token não encontrado ou expirado** — mesma mensagem genérica nos dois casos, sem
   diferenciar "nunca existiu" de "expirou" (anti-enumeração, mesmo padrão do claim).
4. **Reemissão** — pedir reset de novo antes de consumir o token anterior sobrescreve o par no
   banco; o token antigo vira órfão (não bate mais com nada salvo), sem passo explícito de
   invalidação — mesma consequência do claim.
5. **Conta CLAIMABLE pedindo reset** — tratada como qualquer outra conta: emite token de reset
   normalmente. Consumir só mexe no par de reset, nunca no par de claim — os dois ficam
   independentes.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| POST | `/auth/forgot-password` | público, throttle de `/auth/*` | `email`. Sempre `200 { message }`, exista ou não o e-mail. |
| POST | `/auth/reset-password` | público, throttle de `/auth/*` | `token` (≤128), `password` (8–72). Consome o token. `200 { accessToken, user }` + cookie httpOnly de refresh, ou `401` se inválido/expirado. |

## UI Behavior
`/forgot-password` (fora de guards): campo único de e-mail; sucesso troca o form por mensagem
estática genérica, que nunca varia se o e-mail existir ou não. `/reset-password?token=`: sem
`token` na URL, mostra link inválido sem chamar a API; com token, vai direto pro formulário de
senha (sem preview — ver Known Gaps); sucesso autentica e redireciona pro painel do papel
(`BRAND`→`/brand`, `INFLUENCER`→`/influencer`), diferente do claim que é influencer-only e vai
sempre pra `/influencer`. Ambas usuárias já autenticadas são redirecionadas antes de ver o form.

## Acceptance Criteria
- [x] `POST /auth/forgot-password` retorna a mesma resposta para e-mail existente e inexistente.
- [x] `POST /auth/forgot-password` não escreve token nem manda e-mail para conta `isActive: false`.
- [x] Consumir um token válido zera o par de reset e autentica a conta na mesma resposta.
- [x] Token inexistente ou expirado retorna `401` com a mesma mensagem genérica.
- [x] Sucesso no reset redireciona pro painel certo do papel (`BRAND`/`INFLUENCER`).
- [x] Conta CLAIMABLE consegue completar reset sem que isso afete o par de claim.

## Error Scenarios
- Token inexistente ou expirado (consumo) → `401`, mensagem genérica de link inválido/expirado.
- Excesso de tentativas pelo mesmo IP → `429` (throttle de `/auth/*`, 5/15min).
- E-mail desconhecido ou conta desativada (emissão) → `200` idêntico ao caso de sucesso real.

## Known Gaps
- **Sem endpoint de preview antes do formulário** — decisão deliberada, não lacuna a fechar
  por padrão: com TTL de 1h a maioria dos acessos acontece logo após o pedido, e quem chegou
  aqui acabou de digitar o próprio e-mail em `/forgot-password` segundos antes — confirmar
  identidade de novo não agrega. Link inválido/expirado só aparece no erro do submit, mesmo
  comportamento que o claim tinha antes de ganhar preview (v0.29.0).
- **Sem cooldown de emissão por e-mail** — só o throttle por IP (`AUTH_THROTTLE`, 5/15min)
  protege `/auth/forgot-password`. Um ataque distribuído por várias origens ainda poderia
  bombardear o e-mail de uma vítima com pedidos de reset. Aceito por ora, sem evidência de abuso
  — revisar se acontecer.
- **E-mail de reset não tem nome personalizado** — ao contrário do claim (`sendClaimAccount`,
  que sempre atende influencer), o reset serve os dois papéis e buscar o nome exigiria um
  `include` extra sem necessidade real pra um e-mail transacional de segurança.

## Test Coverage
- `apps/api/src/modules/auth/application/auth.service.spec.ts` → `describe('forgotPassword')`
  — `- [x]` e-mail desconhecido não escreve nem envia, `- [x]` conta desativada idem, `- [x]`
  conta ativa grava o par e envia o e-mail, `- [x]` nunca lança mesmo se o e-mail falhar.
  `describe('resetPassword')` — `- [x]` sucesso, `- [x]` token inexistente, `- [x]` token
  expirado.
- `apps/api/src/modules/auth/presentation/auth.controller.throttle.spec.ts` — `- [x]`
  `forgotPassword`/`resetPassword` carregam `AUTH_THROTTLE`.
- `apps/api/src/modules/email/email.service.spec.ts` — `- [x]` `sendPasswordReset` manda o link
  certo.
- `apps/web/src/pages/auth/ForgotPasswordPage.spec.tsx` — `- [x]` existe (validação, sucesso
  genérico, 429, sem-conexão, guard, link de volta).
- `apps/web/src/pages/auth/ResetPasswordPage.spec.tsx` — `- [x]` existe (sem token, sem preview,
  validação, sucesso por papel BRAND e INFLUENCER, 401/429/sem-conexão, guard).
- `apps/web/src/pages/auth/LoginPage.spec.tsx` — `- [x]` "Esqueci minha senha?" aponta pro
  `/forgot-password`.
- `apps/web/src/utils/redirectPath.spec.ts` — `- [x]` os 3 papéis.

## Current Implementation
- Token bruto: `randomBytes(32).toString('hex')`. Hash salvo: SHA-256 do token bruto — mesmo
  padrão do claim e do refresh token.
- `RESET_TOKEN_TTL_MS = 60 * 60 * 1000` (1h), constante em `auth.service.ts`.
- `AuthModule` passou a importar `EmailModule` — antes só `CreatorsService` (claim) enviava
  e-mail; `AuthService` agora também depende de `EmailService`.
- `redirectPath` (antes local em `LoginPage`) virou util compartilhado em
  `apps/web/src/utils/redirectPath.ts`, usado por `LoginPage` e `ResetPasswordPage`.
- Frontend: POST chamado inline no handler de submit (convenção do projeto — mutações não usam
  `useMutation`), não há hook dedicado porque não há GET/preview nesta capacidade.

## Change History
- 2026-09-02 · implementação inicial — endpoints, telas, migration `resetTokenHash`/
  `resetTokenExpiresAt`, link "Esqueci minha senha?" de volta no Login.
