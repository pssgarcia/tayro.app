---
slug: creator-account
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-31
implements:
  - apps/web/src/hooks/useInstagramHandleCheck.ts
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
- Trocar senha logada — ver `password-change` (capacidade própria, 2026-09-02).
- Trocar e-mail logado — ver `email-change` (capacidade própria, 2026-09-02).
- Exclusão de conta — mesmo gap de `brand-account` (bloqueado por `D-E`, `ABERTA`).
- Sincronização de dados do Instagram (seguidores, engajamento, feed) — ver `instagram-sync`;
  este fluxo só lê esses campos, nunca escreve. A **verificação de existência do @** também
  pertence àquela capacidade; aqui só está descrito o que o cadastro faz com o desfecho.

## Domain
`Influencer` é 1:1 com `User` (`role=INFLUENCER`), sem máquina de estados: perfil é mutável
livremente, com uma exceção deliberada.

Campos: `name`, `avatarUrl?`, `bio?`, `instagramHandle?` (**único**, ver Behavior), `tiktokHandle?`,
`niches: string[]`, `city?`, `phone?`, `publicProfileEnabled: boolean` (default `false` —
`D-06`). Campos de cache de Instagram
(`followersCount`, `igEngagementRate`, `igFetchStatus`, etc.) são **lidos** pelo perfil mas
pertencem à capacidade `instagram-sync`.

`phone` e `instagramHandle` continuam `String?` **no schema** (contas criadas antes de
2026-09-02 podem não ter), mas os dois são **obrigatórios no formulário de cadastro** desde essa
data — a nulidade da coluna é histórico, não escolha de produto. `phone` é editável em
`PATCH /influencers/me`; `instagramHandle` não (ver Behavior).

`publicProfileEnabled` governa também a saída do **telefone** em `/c/:handle` — é o
consentimento único de publicar identidade e contato. Ver `public-creator-profile`.

## Behavior
- Cadastro cria `User(role=INFLUENCER)` e `Influencer` como uma única operação.
- **`instagramHandle` e `phone` são obrigatórios no cadastro** (desde 2026-09-02). O handle é a
  chave de tudo que a creator ganha aqui — media kit vivo, seguidores, engajamento, posts e o
  perfil público em `/c/:handle`; sem ele a conta nascia sem nada disso e a marca via "Dados do
  Instagram indisponíveis" pra sempre. O telefone é o contato que a marca usa depois de aprovar
  (`creator-roster`). O handle continua passando pela verificação de existência no Instagram
  antes de avançar o passo (`D-19`, ver `instagram-sync`).
- **Apagar o telefone é permitido**: `PATCH /influencers/me` com `phone: ""` grava `null`. Sem
  isso, um telefone digitado errado seria impossível de remover. String vazia nunca é
  persistida — o front decide o que mostrar por `phone == null`.
- `instagramHandle` é **imutável** por este fluxo de edição de perfil — é a única proteção
  contra a creator quebrar, sem querer, o link público (`/c/:handle`) ou a chave de cache do
  Instagram. Handle é normalizado no cadastro (prefixo `@` removido, minúsculas, sem espaços
  nas pontas) antes de ser validado como único.
- `publicProfileEnabled` nasce `false` (`D-06`) — a marca só descobre o perfil público de uma
  creator quando ela liga esse toggle.
- A conta nasce com o status de busca do Instagram em **"em busca"**, e o cadastro dispara a
  sincronização em background (ver `instagram-sync`). Deixar o status vazio não é neutro: a
  interface da marca lê ausência de status como falha, então a creator apareceria como "dados
  indisponíveis" antes de qualquer tentativa ter existido.
- E-mail **ou** handle do Instagram já em uso bloqueiam o cadastro, cada um com seu próprio
  motivo de erro.
- **O @ informado no cadastro é verificado antes do envio** (ver `instagram-sync`), e o desfecho
  "não existe" impede concluir o cadastro. O motivo é mais forte aqui do que na candidatura: o
  handle é imutável depois (ver Known Gaps), então um @ digitado errado é permanente — a creator
  não tem como corrigir sozinha, e a marca vê "dados do Instagram indisponíveis" pra sempre.
  Desfecho **indeterminado** não bloqueia: provedor instável nunca pode impedir alguém de criar
  conta. Handle em branco (o campo é opcional) não é verificado.
- "Existe no Instagram" e "está livre no TAYRO" são perguntas diferentes e continuam sendo
  respondidas em momentos diferentes: a primeira no formulário, antes do envio; a segunda no
  envio, como o conflito de sempre.
- `email` nunca é editável por este fluxo.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| POST | `/auth/register/influencer` | público, throttle 5/15min por IP | `email`, `password` (8–72), `name` (≤100), `phone` (≤20, formato de telefone), `instagramHandle` (≤30, normalizado antes de validar, alfabeto do Instagram) — os cinco **obrigatórios** —, `niches?` (≤20 itens, ≤50 chars cada). Retorna `{ accessToken, user }` + cookie httpOnly de refresh. |
| GET | `/ig/handle/:handle` | público, limite de taxa próprio | Verificação de existência do @ usada pelo cadastro. Contrato pertence a `instagram-sync`, não duplicado aqui. |
| GET | `/influencers/me` | `JwtAuthGuard` + role `INFLUENCER` | Perfil completo + `email` achatado de `user.email`. Inclui `igProfilePicUrl` e `id`, que são o que permite a tela mostrar a MESMA foto que a marca vê (a foto sai pelo proxy, nunca pela URL da CDN). |
| PATCH | `/influencers/me` | `JwtAuthGuard` + role `INFLUENCER` | Campos: `name`, `bio`, `city`, `avatarUrl`, `niches`, `tiktokHandle`, `phone` (vazio apaga → `null`), `publicProfileEnabled`. **`instagramHandle` não é aceito neste endpoint.** Grava só o que foi enviado. Retorna o mesmo shape de `GET /influencers/me`. |

## UI Behavior
- **Cadastro** (`/register/influencer`): 3 passos (Identidade+handle → Acesso → Nichos).
  Conflito de e-mail **ou** de handle (409) marca erro inline no passo correspondente — inclui
  o passo de identidade quando o conflito é de handle, não só o de acesso (diferença em relação
  a `brand-account`, que só cobre conflito de e-mail). Falha de rede (sem resposta do servidor)
  mostra mensagem distinta de "sem conexão".
  - O @ é verificado ao sair do campo (se o formato for válido e o valor tiver mudado) e, se
    ainda não houver desfecho, ao tentar avançar do passo de identidade. **O bloqueio acontece
    ali, no passo 1**, e não no "Criar conta" do último passo: o campo com problema precisa estar
    na tela junto com a mensagem, e a página já tem a regra de voltar ao passo do campo quando o
    erro é dele.
  - Desfecho "não existe" impede avançar e explica no campo do @; "indeterminado" mostra aviso
    neutro e deixa seguir; "existe" mostra confirmação discreta, sem seguidores nem foto. Campo
    vazio avança sem verificar nada.
  - Digitar não dispara verificação, e o mesmo @ não é verificado duas vezes na mesma tela.
- **Perfil** (`/influencer/profile`): placa de "preview ao vivo" que promete em texto "é
  exatamente isso que a marca vê", e por isso mostra o mesmo conjunto que a marca lê na Fila e
  em `/brand/creators`: **foto do Instagram** (servida pelo proxy; `avatarUrl` manual é só
  fallback; sem nenhuma das duas, iniciais do nome, nunca um retângulo vazio), nome, `@handle`
  somente leitura com link externo, **telefone** (ou "Telefone não informado", a mesma frase
  que a marca lê quando falta), seguidores/engajamento quando disponíveis, bio e nichos. A
  placa é região nomeada ("Prévia do que a marca vê"). `[CORRIGIDO 2026-09-03: a placa
  ignorava `igProfilePicUrl` e não mostrava telefone, então a promessa era falsa nos dois
  pontos]` +
  linhas "Editar" por campo (exceto `instagramHandle`) + toggle de perfil público com link de
  compartilhamento ao lado. O link de compartilhamento só aparece quando existe
  `instagramHandle` **e** o perfil está confirmadamente público no servidor (não no estado do
  formulário ainda não salvo) — evita mostrar um link que levaria a um 404 se o toggle foi
  ligado mas ainda não salvo. Botão "Salvar" só habilita quando há alteração pendente.

## Acceptance Criteria
- [x] A placa de prévia mostra a foto do Instagram pelo proxy, e nunca a URL da CDN no `src`.
- [x] Sem foto do Instagram e sem `avatarUrl`, a placa mostra as iniciais do nome.
- [x] A placa mostra o telefone, e diz "Telefone não informado" quando não há.
- [x] `GET /influencers/me` pede `igProfilePicUrl` e `id` no `select` (verificado sobre os
      argumentos da consulta, não sobre o retorno: mock devolve o objeto inteiro e um teste de
      retorno passaria com o campo faltando).
- [x] Cadastro com e-mail já em uso retorna `409` com o campo identificado (`email`) e não cria
      `User` nem `Influencer`.
- [x] Cadastro com `instagramHandle` já em uso retorna `409` com o campo identificado
      (`instagramHandle`) e não cria `User` nem `Influencer`.
- [x] `PATCH /influencers/me` nunca altera `instagramHandle`, mesmo se o campo for enviado no
      corpo da requisição.
- [x] Cadastro cria a creator já com status de busca "em busca", nunca sem status.
- [x] Cadastro dispara a sincronização do Instagram da creator recém-criada.
- [x] Perfil recém-cadastrado tem `publicProfileEnabled = false`.
- [x] Editar o perfil sem enviar todos os campos não apaga os campos omitidos.

Verificação do @ no cadastro:
- [x] @ com desfecho "não existe" impede avançar do passo de identidade e a conta não é criada.
- [x] @ com desfecho "indeterminado" não impede o cadastro.
- [x] Campo de @ vazio não dispara verificação nenhuma e não impede o cadastro.
- [x] Avançar com @ ainda não verificado verifica antes de avançar.
- [x] O mesmo @ não é verificado duas vezes na mesma tela.
- [x] O motivo do bloqueio aparece no campo do @, no passo em que ele está.
- [x] O endpoint de cadastro continua aceitando qualquer handle de formato válido — ele não
      ganhou dependência de API externa.

## Error Scenarios
- E-mail já cadastrado → `409`, `field: 'email'`.
- `instagramHandle` já cadastrado → `409`, `field: 'instagramHandle'`.
- Consultar/editar perfil sem `Influencer` vinculado ao usuário → `403`.
- Excesso de tentativas de cadastro pelo mesmo IP → `429`.
- @ que não existe no Instagram → o formulário não avança e explica no campo; nada é enviado.
- Verificação do @ indisponível (provedor fora do ar, `429` da rota de verificação, rede) →
  aviso neutro e cadastro liberado.

## Known Gaps
- **Sem fluxo de edição de `instagramHandle`.** O comentário original no DTO já previa "fica
  num fluxo dedicado" — esse fluxo nunca foi implementado. Hoje o handle só muda por edição
  direta no banco (ver footgun `@@handle` em `CLAUDE.md`, que o `instagram-sync` normaliza
  defensivamente por causa disso). A verificação do @ no cadastro (2026-08-26) **reduz** a chance
  de alguém ficar preso a um @ errado, mas não fecha o gap: quem trocou de @ no Instagram depois
  de se cadastrar continua sem saída, e o desfecho "indeterminado" ainda deixa passar um erro de
  digitação quando o provedor está fora do ar.
- **Contas criadas antes de 2026-09-02 podem estar sem `instagramHandle`.** O campo passou a ser
  obrigatório no cadastro nessa data, mas a coluna segue anulável e **não existe fluxo de edição
  de handle** — quem se cadastrou sem ele continua aparecendo pra marca como "dados
  indisponíveis", sem saída pela interface. Fechar isso é um fluxo dedicado de troca de handle
  (ver Out of Scope), não uma extensão do Perfil.
- **Contas antigas sem `phone` agora têm como preencher** (row "Telefone" no Perfil), mas ninguém
  as avisa disso — não há prompt, banner ou e-mail. Na prática só preenche quem entrar no Perfil
  por conta própria.

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.me.spec.ts` — `- [x]`
  `getMe`/`updateMe`.
- `apps/api/src/modules/auth/application/auth.service.ts` → `describe('registerInfluencer')` —
  `- [x]` sucesso, `- [x]` conflito de `instagramHandle`, `- [x]` conflito de `email`.
- `apps/web/src/pages/influencer/RegisterInfluencerPage.spec.tsx` — `- [x]` existe, incluindo
  `describe('RegisterInfluencerPage — verificação do @ do Instagram')`: `- [x]` "não existe"
  impede avançar e não cria conta; `- [x]` "indeterminado" deixa seguir; `- [x]` campo vazio não
  verifica; `- [x]` avançar com @ não verificado verifica antes; `- [x]` sem verificação repetida
  do mesmo @; `- [x]` mensagem no campo do @.
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
- Verificação do @: bloqueio acontece dentro de `next()` (a função que avança o passo do
  carrossel), não em `onSubmit` — o handle é opcional e vive no passo 0 (Identidade), longe do
  passo final onde o submit real corre. `cleanHandle()` (já existia, normaliza `@`/maiúsculas/
  espaço) decide se há algo pra verificar; campo vazio pula a verificação inteira. Mesmo hook
  `useInstagramHandleCheck` do `PublicApplyPage` (ver `creator-discovery-and-apply`).

## Change History
- 2026-09-03 · a prévia do Perfil passou a mostrar a foto do Instagram e o telefone. Antes
  olhava só o `avatarUrl` (campo manual, vazio em 21 das 21 creators do banco de dev), então
  era um retângulo cinza para todo mundo, sem nem as iniciais que o resto do produto usa, e o
  telefone não aparecia em lugar nenhum da placa embora a marca o veja como link `tel:`.
  `getMe` passou a selecionar `igProfilePicUrl`. A placa virou região nomeada, o que também deu
  escopo estável aos testes (o telefone agora existe em duas superfícies da mesma tela).
- 2026-09-02 · row "E-mail" da seção "Conta" (`AccountSection`) virou clicável — ver `email-change`.
- 2026-09-02 · `ProfilePage.tsx` passou a embutir `AccountSection` (seção "Conta") no lugar do
  antigo bloco só-leitura de e-mail. Trocar senha logada fechado — ver `password-change`.
- 2026-08-31 · schema ganhou `Influencer.phone String?` (ver `creator-discovery-and-apply`) —
  este fluxo (cadastro + `PATCH /influencers/me`) não foi alterado, o campo simplesmente não é
  lido nem escrito aqui. Documentado em Domain e Known Gaps pra quem procurar `phone` no schema
  e assumir, por engano, que passa por este fluxo.
- 2026-08-27 · **implementada** a verificação do @ no cadastro desenhada em 2026-08-26 (ver
  entrada abaixo). Bloqueio em `next()` quando `step === 0`; mensagem manual em
  `errors.instagramHandle`, limpa no próximo `onChange`. Todos os critérios novos das seções
  anteriores viraram `- [x]`.
- 2026-08-26 · `/architect` levou a **verificação do @ do Instagram** também pro cadastro, não só
  pra candidatura pública (ver `creator-discovery-and-apply` e `instagram-sync`). Motivo de o
  cadastro entrar junto: o handle é imutável depois do cadastro, então aqui um @ errado é
  permanente e a creator não tem como consertar sozinha. Mesma mecânica e mesmo hook do
  formulário público; o bloqueio acontece no passo de identidade, onde o campo está. O endpoint
  de cadastro não mudou.
- 2026-08-24 · cadastro passou a nascer com status "em busca" e a disparar a sincronização do
  Instagram. Até então este caminho não fazia nem uma coisa nem outra, e a creator cadastrada
  por aqui chegava à fila da marca como "Dados do Instagram indisponíveis" permanentemente. Ver
  `instagram-sync` → Change History.
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD — sem mudança de comportamento; conflito de e-mail
  e de handle viraram critérios de aceitação separados e verificáveis.
- 2026-09-02 · `instagramHandle` e `phone` viraram **obrigatórios no cadastro** (pedido do Pedro);
  `phone` ganhou row de edição no Perfil (única saída pras contas antigas sem telefone) e um
  telefone passou a sair no perfil público junto do `publicProfileEnabled` (ver
  `public-creator-profile`). Dois Known Gaps de 2026-08-27/31 fechados; sobra o de contas antigas
  sem handle, que exigiria fluxo de troca de handle.
