---
slug: brand-account
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/auth/presentation/auth.controller.ts (POST /auth/register/brand)
  - apps/api/src/modules/auth/application/auth.service.ts (registerBrand)
  - apps/api/src/modules/auth/application/dtos/register-brand.dto.ts
  - apps/api/src/modules/brands/presentation/brands.controller.ts
  - apps/api/src/modules/brands/application/brands.service.ts
  - apps/api/src/modules/brands/application/dtos/update-brand.dto.ts
  - apps/web/src/pages/auth/RegisterBrandPage.tsx
  - apps/web/src/pages/brand/ProfilePage.tsx
related_decisions: []
---

# Conta de marca (cadastro + perfil)

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. A marca precisa de conta própria e de um perfil editável (nome, logo, bio,
nichos, site) porque é esse perfil que a creator vê no link público de candidatura antes de
decidir se aplica.

## Scope
Cadastro de conta de marca e edição do perfil associado.

## Out of Scope
- Troca de e-mail ou senha logada — gap de LGPD conhecido, ver `CLAUDE.md` → "Pendente".
- Exclusão ou anonimização de conta — bloqueado por `D-E` (`ABERTA`).
- Verificação de e-mail no cadastro — não existe fluxo de confirmação.

## Domain
`Brand` é 1:1 com `User` (`role=BRAND`), sem máquina de estados: nasce no cadastro, o perfil é
mutável livremente a qualquer momento depois (nenhum campo é imutável, diferente do creator).

Campos: `name`, `logoUrl?`, `niches: string[]`, `website?`, `bio?`. `User.email` é a fonte do
e-mail — `Brand` não duplica esse dado. Nada em `Brand` é chave de negociação além do vínculo
com `User.email` (`@unique`).

## Behavior
- Cadastro cria `User(role=BRAND)` e `Brand` como uma única operação atômica.
- E-mail já usado por outra conta bloqueia o cadastro — nenhum `User`/`Brand` é criado nesse
  cenário.
- Nenhum campo de `Brand` é imutável: qualquer campo do perfil pode ser editado a qualquer
  momento pelo dono.
- `email` nunca é editável por este fluxo (não há campo de e-mail no update de perfil).

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| POST | `/auth/register/brand` | público, throttle 5/15min por IP | `email`, `password` (8–72), `brandName` (≤100), `niches?` (≤20 itens, ≤50 chars cada), `website?` (≤2048). Retorna `{ accessToken, user }` + cookie httpOnly de refresh. |
| GET | `/brands/me` | `JwtAuthGuard` + role `BRAND` | `{ id, name, logoUrl, niches, website, bio, createdAt, email }` — `email` achatado de `user.email`. |
| PATCH | `/brands/me` | `JwtAuthGuard` + role `BRAND` | Todos os campos opcionais; grava só o que foi enviado (não sobrescreve com `undefined`). |

`website`/`logoUrl` são validados como string com limite de tamanho na API; formato de URL só é
validado no frontend (Zod) — a API aceita qualquer string ≤2048 caracteres.

## UI Behavior
- **Cadastro** (`/register/brand`): formulário em 3 passos (Identidade → Acesso → Nichos).
  Conflito de e-mail (409) marca erro inline no campo e volta pro passo de Acesso. Sucesso:
  autentica e navega pra `/brand`.
- **Perfil** (`/brand/profile`): placa de "preview ao vivo" do cabeçalho que a creator vê em
  `/apply/:id` (nome, logo, bio, nichos, website) + linhas "Editar" que abrem um modal por
  campo. `email` sempre somente leitura. Botão "Salvar" só habilita quando há alteração
  pendente; confirma visualmente após sucesso.

## Acceptance Criteria
- [x] Cadastro com e-mail já em uso retorna `409` e não cria `User` nem `Brand`.
- [x] Cadastro com sucesso retorna token de acesso e autentica a marca imediatamente.
- [x] Editar o perfil sem enviar todos os campos não apaga os campos omitidos.
- [x] `GET /brands/me` sem `Brand` associado ao usuário autenticado retorna `403`.
- [ ] Duas tentativas de cadastro simultâneas com o mesmo e-mail nunca produzem erro genérico
      de servidor (ver Known Gaps — hoje pode acontecer).

## Error Scenarios
- E-mail já cadastrado → `409`.
- Editar/consultar perfil sem `Brand` vinculado ao usuário (não deveria ocorrer para `role=BRAND`
  genuíno) → `403`.
- Excesso de tentativas de cadastro pelo mesmo IP → `429` (throttle de `/auth/*`).

## Known Gaps
- **Checagem de e-mail é check-then-act, não atômica.** `registerBrand` faz um `findUnique` por
  e-mail antes do `create` (em vez de confiar só no `@unique` do banco, como o fluxo de creator
  faz). Numa corrida entre dois cadastros simultâneos com o mesmo e-mail, o segundo pode cair no
  erro genérico de conflito de banco (`P2002` não tratado) em vez do `409` esperado. Janela
  estreita, não corrigida neste retrofit.

## Test Coverage
- `apps/api/src/modules/brands/application/brands.service.spec.ts` — `- [x]` `getMe`/`updateMe`.
- `apps/api/src/modules/auth/application/auth.service.spec.ts` → `describe('registerBrand')` —
  `- [x]` conflito de e-mail. `- [ ]` caminho de sucesso de `registerBrand` não tem teste próprio
  neste describe.
- `apps/web/src/pages/auth/RegisterBrandPage.spec.tsx` — `- [x]` existe.
- `apps/web/src/pages/brand/ProfilePage.spec.tsx` — `- [x]` existe.

## Current Implementation
- `registerBrand`: `prisma.user.create` com `brand: { create: {...} }` aninhado — atômico por
  construção do Prisma (não precisa de `$transaction` explícito porque é uma única árvore de
  criação relacional).
- `assertEmailAvailable` (privado em `AuthService`) roda o `findUnique` mencionado em Known Gaps.
- `PATCH /brands/me`: `P2025` (linha não encontrada na hora de atualizar) é mapeado pra `403`,
  mesmo padrão do "404 vira 403" usado no `GET`.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD — sem mudança de comportamento; a checagem de
  e-mail não-atômica, antes narrada dentro de "Endpoints", agora é `Known Gap` explícito com
  critério de aceitação correspondente ainda em aberto.
