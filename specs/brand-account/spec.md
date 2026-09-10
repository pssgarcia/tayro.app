---
slug: brand-account
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-23
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
- Trocar senha logada — ver `password-change` (capacidade própria, 2026-09-02).
- Trocar e-mail logado — ver `email-change` (capacidade própria, 2026-09-02).
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
  cenário. A garantia vem da unicidade do próprio dado, não de uma consulta prévia: duas
  tentativas simultâneas com o mesmo e-mail produzem uma conta e um conflito explícito
  (`409`, com o campo em falta identificado), nunca duas contas nem erro genérico de servidor.
  Mesma garantia do cadastro de creator.
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
- [x] Duas tentativas de cadastro simultâneas com o mesmo e-mail nunca produzem erro genérico
      de servidor: a segunda recebe `409` com `field: 'email'`.
- [x] O conflito de e-mail no cadastro de marca responde no mesmo formato do cadastro de
      creator (`{ statusCode, error, message, field }`), permitindo erro inline no campo certo.

## Error Scenarios
- E-mail já cadastrado → `409`.
- Editar/consultar perfil sem `Brand` vinculado ao usuário (não deveria ocorrer para `role=BRAND`
  genuíno) → `403`.
- Excesso de tentativas de cadastro pelo mesmo IP → `429` (throttle de `/auth/*`).

## Known Gaps
Trocar senha logada e trocar e-mail logado **foram fechados em 2026-09-02** — ver
`password-change`/`email-change`. (O check-then-act na verificação de e-mail no cadastro,
registrado no retrofit de 2026-08-21, foi **corrigido em 2026-08-23** — ver Change History.)

## Test Coverage
- `apps/api/src/modules/brands/application/brands.service.spec.ts` — `- [x]` `getMe`/`updateMe`.
- `apps/api/src/modules/auth/application/auth.service.spec.ts` → `describe('registerBrand')` —
  `- [x]` caminho de sucesso (cria e devolve token), `- [x]` conflito de e-mail vindo da
  constraint do banco (`P2002`) com `field: 'email'`, `- [x]` erro que não é `P2002` propaga
  sem virar `409`.
- `apps/web/src/pages/auth/RegisterBrandPage.spec.tsx` — `- [x]` existe.
- `apps/web/src/pages/brand/ProfilePage.spec.tsx` — `- [x]` existe.

## Current Implementation
- `registerBrand`: `prisma.user.create` com `brand: { create: {...} }` aninhado — atômico por
  construção do Prisma (não precisa de `$transaction` explícito porque é uma única árvore de
  criação relacional). O conflito de e-mail é tratado no `catch` de
  `Prisma.PrismaClientKnownRequestError` com `code === 'P2002'`, sem consulta prévia — mesmo
  formato de resposta usado por `registerInfluencer`.
- `PATCH /brands/me`: `P2025` (linha não encontrada na hora de atualizar) é mapeado pra `403`,
  mesmo padrão do "404 vira 403" usado no `GET`.

## Change History
- 2026-09-03 · a placa de prévia do Perfil da marca passou a mostrar as iniciais do nome quando
  não há logo, em vez de um retângulo cinza vazio. Mesmo defeito que a placa da creator tinha,
  corrigido no mesmo passo por consistência.
- 2026-09-02 · row "E-mail" da seção "Conta" (`AccountSection`) virou clicável — ver `email-change`.
- 2026-09-02 · `ProfilePage.tsx` passou a embutir `AccountSection` (seção "Conta") no lugar do
  antigo bloco só-leitura de e-mail. Trocar senha logada fechado — ver `password-change`.
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD — sem mudança de comportamento; a checagem de
  e-mail não-atômica, antes narrada dentro de "Endpoints", agora é `Known Gap` explícito com
  critério de aceitação correspondente ainda em aberto.
- 2026-08-23 · check-then-act de e-mail **removido**: `registerBrand` passou a confiar na
  constraint `@unique` e traduzir `P2002` em `409` com `field`, como o cadastro de creator já
  fazia. Fecha o Known Gap de corrida e o critério de aceitação correspondente; o corpo do erro
  ficou mais informativo (antes era a string genérica "Email already in use").
## Change History (complemento)
- 2026-09-04 · `POST /auth/register/brand` passou a exigir `acceptedTermsAndPrivacy` e
  `declaredAdult`; as duas caixas vivem no último passo do cadastro. A exportação de dados da
  marca ganhou `legalAcceptance`. Ver `specs/legal-acceptance`.
