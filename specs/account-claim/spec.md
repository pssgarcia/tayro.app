---
slug: account-claim
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/auth/presentation/auth.controller.ts (POST /auth/claim, GET /auth/claim/:token)
  - apps/api/src/modules/auth/application/auth.service.ts (claimAccount, getClaimPreview)
  - apps/api/src/modules/auth/application/dtos/claim-account.dto.ts
  - apps/api/src/modules/creators/application/creators.service.ts (generateClaimToken, issueClaimToken, sendClaimEmail — dentro de findOrCreateInfluencer)
  - apps/web/src/pages/auth/ClaimAccountPage.tsx
  - apps/web/src/hooks/useClaimPreview.ts
related_decisions: [D-14]
---

# Claim de conta CLAIMABLE

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. Fecha o ciclo de `creator-discovery-and-apply`: uma creator que se
candidata via `/apply/:id` sem ter conta ganha uma conta com senha aleatória que ninguém sabe —
sem este fluxo ela nunca conseguiria entrar na própria conta.

## Scope
Emissão, reemissão, preview e consumo do token que permite a uma creator definir a própria
senha e assumir posse de uma conta criada em seu nome.

## Out of Scope
- Como e quando a conta é criada — isso é `creator-discovery-and-apply`. Esta spec cobre só o
  que acontece a partir da criação dela.
- Reenvio manual de link perdido pela própria creator — ver Known Gaps (`D-14`).
- Revogação manual do token pela creator (ex.: "não fui eu que me candidatei") — não existe.

## Domain
Estado binário em `User`, não um enum dedicado: "aguardando claim" = `claimTokenHash`
preenchido; "claimada" (ou nunca precisou) = `claimTokenHash = null`. `claimTokenExpiresAt`
guarda o vencimento (TTL de 7 dias a partir da emissão). O token bruto (32 bytes aleatórios,
hexadecimal) só existe em trânsito, na URL do e-mail; o banco guarda apenas o hash SHA-256 —
mesmo padrão do refresh token.

## Behavior

### Ciclo de vida do token
1. **Emitido** — na criação da conta (capacidade `creator-discovery-and-apply`), junto com um
   e-mail contendo o link de claim.
2. **Reemitido** — se a creator se candidata de novo a outro programa **antes** de ter definido
   senha, um token novo é gerado, sobrescreve o anterior no banco, e um novo e-mail é enviado.
   O token antigo passa a não bater com nada salvo (fica órfão), mas não existe um passo
   explícito de "invalidar" — é consequência da sobrescrita.
3. **Consumido** — com token válido e não expirado: senha é definida, o par
   `claimTokenHash`/`claimTokenExpiresAt` é zerado, e a creator é autenticada automaticamente
   (mesmo mecanismo de sessão do login normal).
4. **Expirado ou inválido** — token não encontrado, ou vencido: tratado como o mesmo caso de
   erro em ambos os endpoints (preview e consumo), com a mesma mensagem — deliberadamente não
   diferencia "nunca existiu" de "expirou", pra não dar pista de enumeração.

### Regras de negócio
- TTL fixo de 7 dias, não configurável.
- Reemissão automática só acontece como efeito colateral de reaplicar a um programa — **não
  existe um endpoint que a creator possa chamar sozinha** pra pedir um novo link (`D-14`,
  `TEMPORÁRIA`).
- Preview (consulta) e consumo compartilham a mesma condição de validade do token; o preview
  soma a exigência de a conta ter um perfil de creator associado (sempre verdadeiro neste
  fluxo, mas a checagem existe).

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| GET | `/auth/claim/:token` | público, throttle de `/auth/*` | **Não consome o token.** Retorna `{ instagramHandle, email, avatarUrl, influencerId, hasIgAvatar, campaignTitle }`. `campaignTitle` vem da candidatura mais recente da creator e é `null` se ainda não houver nenhuma. |
| POST | `/auth/claim` | público, throttle de `/auth/*` | `token` (≤128), `password` (8–72). Consome o token. Retorna `{ accessToken, user }` + cookie httpOnly de refresh. |

## UI Behavior
`/claim?token=` (fora de guards de autenticação): sem `token` na URL, mostra link inválido sem
sequer chamar a API. Com token, busca o preview antes de mostrar o formulário — se o preview
falhar por token inválido/expirado, a mensagem de erro aparece **antes do formulário**, não só
depois de tentar submeter. Se o preview falhar por outro motivo (rede, erro de servidor), a
tela degrada mostrando o formulário sem os dados de identidade — o `POST` no submit continua
sendo quem valida o token de fato. Preview com sucesso mostra identidade (avatar, `@handle`,
e-mail) e o título da candidatura mais recente. Sucesso no submit autentica e navega para a
área da creator.

## Acceptance Criteria
- [x] Preview com token inexistente ou expirado retorna `401` com a mesma mensagem, sem
      distinguir os dois casos.
- [x] Consumo com token inexistente ou expirado retorna `401` com a mesma mensagem.
- [x] Consumir um token válido zera `claimTokenHash`/`claimTokenExpiresAt` e autentica a
      creator na mesma resposta.
- [x] Reaplicar a um programa com um token de claim ainda pendente gera um token novo e invalida
      o anterior (o anterior deixa de bater com o hash salvo).
- [x] Preview sem nenhuma candidatura da creator retorna `campaignTitle: null` em vez de erro.

## Error Scenarios
- Token inexistente (preview ou consumo) → `401`, mensagem genérica de link inválido/expirado.
- Token expirado (preview ou consumo) → `401`, mesma mensagem do caso anterior.
- Excesso de tentativas pelo mesmo IP → `429` (throttle de `/auth/*`).

## Known Gaps
- **Sem reenvio manual de link perdido.** Se a creator perde o e-mail e não tem mais nenhum
  programa pra reaplicar, ela fica travada — `D-14`, `TEMPORÁRIA`, revisar quando a primeira
  creator real esbarrar nisso.

## Test Coverage
- `apps/api/src/modules/auth/application/auth.service.spec.ts` → `describe('claimAccount')` —
  `- [x]` sucesso, `- [x]` token inexistente, `- [x]` token expirado. `describe('getClaimPreview')`
  — `- [x]` sucesso, `- [x]` `campaignTitle` null sem candidatura, `- [x]` token inexistente,
  `- [x]` token expirado.
- `apps/api/src/modules/creators/application/creators.service.claim.spec.ts` — `- [x]`
  emissão/reemissão do token dentro do fluxo de candidatura.
- `apps/web/src/pages/auth/ClaimAccountPage.spec.tsx` — `- [x]` existe.

## Current Implementation
- Token bruto: `randomBytes(32).toString('hex')`. Hash salvo: SHA-256 do token bruto
  (`crypto.createHash('sha256')`), nunca o valor em claro.
- `getClaimPreview` inclui a candidatura mais recente via `orderBy appliedAt desc, take: 1` —
  não é uma query por candidatura, é uma relação incluída na mesma consulta do usuário.
- Preview no frontend via hook dedicado `useClaimPreview` (padrão do projeto: hook por endpoint,
  não `useQuery` inline).
- Avatar no preview usa o proxy `/ig/avatar/:influencerId` quando `hasIgAvatar`, senão o
  `avatarUrl` bruto — mesmo mecanismo descrito em `instagram-sync` (footgun CORP).

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD — sem mudança de comportamento; ciclo de vida do
  token movido de "Máquina de estados (implícita)" pra `Behavior`, mantendo o mesmo conteúdo.
