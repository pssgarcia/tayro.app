---
slug: creator-account
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/auth/presentation/auth.controller.ts (POST /auth/register/influencer)
  - apps/api/src/modules/auth/application/auth.service.ts (registerInfluencer)
  - apps/api/src/modules/auth/application/dtos/register-influencer.dto.ts
  - apps/api/src/modules/creators/presentation/influencers.controller.ts
  - apps/api/src/modules/creators/application/creators.service.ts (getMe, updateMe)
  - apps/api/src/modules/creators/application/dtos/update-influencer.dto.ts
  - apps/web/src/pages/influencer/RegisterInfluencerPage.tsx
  - apps/web/src/pages/influencer/ProfilePage.tsx
related_decisions: [D-06]
---

# Conta de creator (cadastro + perfil)

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. Fundação da experiência de creator: precisa de conta própria e de um perfil
editável, incluindo o opt-in de perfil público (`D-06`, LGPD — default desligado).

## Scope
Cadastro de conta de creator e edição do perfil associado, incluindo o toggle de perfil público.

## Out of Scope
- Edição de `instagramHandle` — nunca existiu um fluxo dedicado (ver Known Gaps).
- Troca de e-mail/senha logada, exclusão de conta — mesmos gaps de `brand-account`.
- Sincronização de dados do Instagram (seguidores, engajamento, feed) — ver `instagram-sync`;
  este fluxo só lê esses campos, nunca escreve.

## Domain
`Influencer` é 1:1 com `User` (`role=INFLUENCER`), sem máquina de estados: perfil é mutável
livremente, com uma exceção deliberada.

Campos: `name`, `avatarUrl?`, `bio?`, `instagramHandle?` (**único**, ver Behavior), `tiktokHandle?`,
`niches: string[]`, `city?`, `publicProfileEnabled: boolean` (default `false` — `D-06`). Campos
de cache de Instagram (`followersCount`, `igEngagementRate`, `igFetchStatus`, etc.) são
**lidos** pelo perfil mas pertencem à capacidade `instagram-sync`.

## Behavior
- Cadastro cria `User(role=INFLUENCER)` e `Influencer` como uma única operação.
- `instagramHandle` é **imutável** por este fluxo de edição de perfil — é a única proteção
  contra a creator quebrar, sem querer, o link público (`/c/:handle`) ou a chave de cache do
  Instagram. Handle é normalizado no cadastro (prefixo `@` removido, minúsculas, sem espaços
  nas pontas) antes de ser validado como único.
- `publicProfileEnabled` nasce `false` (`D-06`) — a marca só descobre o perfil público de uma
  creator quando ela liga esse toggle.
- E-mail **ou** handle do Instagram já em uso bloqueiam o cadastro, cada um com seu próprio
  motivo de erro.
- `email` nunca é editável por este fluxo.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| POST | `/auth/register/influencer` | público, throttle 5/15min por IP | `email`, `password` (8–72), `name` (≤100), `instagramHandle?` (≤30, normalizado antes de validar), `niches?` (≤20 itens, ≤50 chars cada). Retorna `{ accessToken, user }` + cookie httpOnly de refresh. |
| GET | `/influencers/me` | `JwtAuthGuard` + role `INFLUENCER` | Perfil completo + `email` achatado de `user.email`. |
| PATCH | `/influencers/me` | `JwtAuthGuard` + role `INFLUENCER` | Campos: `name`, `bio`, `city`, `avatarUrl`, `niches`, `tiktokHandle`, `publicProfileEnabled`. **`instagramHandle` não é aceito neste endpoint.** Grava só o que foi enviado. Retorna o mesmo shape de `GET /influencers/me`. |

## UI Behavior
- **Cadastro** (`/register/influencer`): 3 passos (Identidade+handle → Acesso → Nichos).
  Conflito de e-mail **ou** de handle (409) marca erro inline no passo correspondente — inclui
  o passo de identidade quando o conflito é de handle, não só o de acesso (diferença em relação
  a `brand-account`, que só cobre conflito de e-mail). Falha de rede (sem resposta do servidor)
  mostra mensagem distinta de "sem conexão".
- **Perfil** (`/influencer/profile`): placa de "preview ao vivo" (nome, avatar, `@handle`
  somente leitura com link externo, seguidores/engajamento quando disponíveis, bio, nichos) +
  linhas "Editar" por campo (exceto `instagramHandle`) + toggle de perfil público com link de
  compartilhamento ao lado. O link de compartilhamento só aparece quando existe
  `instagramHandle` **e** o perfil está confirmadamente público no servidor (não no estado do
  formulário ainda não salvo) — evita mostrar um link que levaria a um 404 se o toggle foi
  ligado mas ainda não salvo. Botão "Salvar" só habilita quando há alteração pendente.

## Acceptance Criteria
- [x] Cadastro com e-mail já em uso retorna `409` com o campo identificado (`email`) e não cria
      `User` nem `Influencer`.
- [x] Cadastro com `instagramHandle` já em uso retorna `409` com o campo identificado
      (`instagramHandle`) e não cria `User` nem `Influencer`.
- [x] `PATCH /influencers/me` nunca altera `instagramHandle`, mesmo se o campo for enviado no
      corpo da requisição.
- [x] Perfil recém-cadastrado tem `publicProfileEnabled = false`.
- [x] Editar o perfil sem enviar todos os campos não apaga os campos omitidos.

## Error Scenarios
- E-mail já cadastrado → `409`, `field: 'email'`.
- `instagramHandle` já cadastrado → `409`, `field: 'instagramHandle'`.
- Consultar/editar perfil sem `Influencer` vinculado ao usuário → `403`.
- Excesso de tentativas de cadastro pelo mesmo IP → `429`.

## Known Gaps
- **Sem fluxo de edição de `instagramHandle`.** O comentário original no DTO já previa "fica
  num fluxo dedicado" — esse fluxo nunca foi implementado. Hoje o handle só muda por edição
  direta no banco (ver footgun `@@handle` em `CLAUDE.md`, que o `instagram-sync` normaliza
  defensivamente por causa disso).

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.me.spec.ts` — `- [x]`
  `getMe`/`updateMe`.
- `apps/api/src/modules/auth/application/auth.service.ts` → `describe('registerInfluencer')` —
  `- [x]` sucesso, `- [x]` conflito de `instagramHandle`, `- [x]` conflito de `email`.
- `apps/web/src/pages/influencer/RegisterInfluencerPage.spec.tsx` — `- [x]` existe.
- `apps/web/src/pages/influencer/ProfilePage.spec.tsx` — `- [x]` existe.
- **Nota:** `apps/api/src/modules/creators/application/creators.service.race.spec.ts` (corrida
  em `findOrCreateInfluencer`) pertence à capacidade `creator-discovery-and-apply`, não a esta —
  o arquivo mora neste diretório de módulo por acoplamento de código, não de domínio.

## Current Implementation
- `registerInfluencer` **não** faz check-then-act de e-mail/handle (diferente de
  `brand-account`): confia nos `@unique` do schema e trata `P2002` no `catch`, extraindo qual
  campo colidiu pra montar o `409` com `field`. Comentário no código confirma a escolha
  deliberada: evita janela de corrida entre dois cadastros simultâneos.
- `instagramHandle` é normalizado via `@Transform` no DTO (remove `@` prefixado, minúsculas,
  trim) antes da validação.
- `PATCH /influencers/me` chama `getMe` internamente após o `update`, garantindo que a resposta
  tenha sempre o mesmo shape do `GET`.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD — sem mudança de comportamento; conflito de e-mail
  e de handle viraram critérios de aceitação separados e verificáveis.
