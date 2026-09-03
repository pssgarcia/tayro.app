---
slug: creator-roster
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-02
implements:
  - apps/api/src/modules/applications/application/applications.service.ts (findApprovedForBrand)
  - apps/api/src/modules/applications/presentation/applications.controller.ts (GET /applications/approved)
  - apps/web/src/pages/brand/ApprovedCreatorsPage.tsx
  - apps/web/src/hooks/useApprovedCreators.ts
  - apps/web/src/utils/format.ts (whatsappLinkFromPhone)
  - apps/web/src/components/primitives/WhatsAppIcon.tsx
  - apps/web/src/components/layouts/BrandLayout.tsx (nav "Creators")
related_decisions: [D-08]
---

# Creator roster (creators aprovadas, cross-campanha)

## Objective
Depois de aprovar uma candidatura na Fila, a marca só via aquela creator dentro do contexto de
UMA campanha por vez — sem lugar único pra ver todo o elenco já aprovado, nem um jeito de
contatar a creator sem sair procurando o @ ou o telefone dentro da Fila de cada campanha.

Avaliado no `/feature` em 2026-09-02: o veredito foi `DEPOIS` (a capacidade de "ver quem foi
aprovado" já existe por campanha desde 2026-08-27, e não há marca real pra confirmar que a
agregação cross-campanha importa). **Pedro decidiu construir mesmo assim**, escopando o pedido
pra fora do que o `/feature` bloqueou de fato — tirou o chat in-app (que contrariava `D-08`) e
pediu, em vez disso, um botão que leva pro WhatsApp (que **reforça** `D-08`: "WhatsApp já existe
e ganha"). Ver `decisions.md` → reafirmação de 2026-09-02 sob a entrada de 2026-08-26.

`[HIPÓTESE não testada]`: que uma visão agregada + contato de um clique reduz o "perder o fio de
quem já está dentro" (dor nº2 da Marina, `personas.md`) o suficiente pra ser usada de verdade.
Sem marca real operando, não há como confirmar isso ainda.

## Scope
- Endpoint de leitura que agrega, por creator, todas as `Application` com `status=APPROVED` das
  campanhas da marca logada.
- Página nova na marca (`/brand/creators`) que lista essas creators e mostra o media kit de cada
  uma (mesmos dados já usados na Fila: foto, @handle, seguidores, engajamento, posts recentes).
- Botão que abre uma conversa de WhatsApp com o telefone da creator, se o telefone existir e for
  possível montar um número válido a partir dele.

## Out of Scope
- Chat dentro do produto — avaliado e recusado (`D-08`; reafirmado no `/feature` de 2026-09-02).
- Qualquer estado próprio de "creator na carteira da marca" (nota, tag, favoritar) que sobreviva
  a uma candidatura sendo retirada/rejeitada — isso exigiria um modelo novo (`BrandCreator`),
  avaliado no `/architect` e deliberadamente não escolhido por ser o primeiro passo de "carteira
  trazida de fora", zona adjacente a `D-B` (ver `decisions.md`, propostas rejeitadas 2026-08-27).
  Se a marca precisar disso, é feature nova, não extensão desta.
- Paginação — não construída; ver Known Gaps.
- Ciclo de vida da `Application` em si (aprovar/rejeitar/retirar) — ver `applications-pipeline`.
- Interface de revisão por campanha (Fila) — ver `campaign-fila-review`. Esta spec não substitui
  a Fila, é uma visão complementar cross-campanha.

## Domain
Nenhum conceito novo. É uma projeção sobre `Application` (`status=APPROVED`) agrupada por
`influencerId`, cruzando todas as `Campaign` de uma mesma `Brand`. Uma creator aprovada em N
campanhas da mesma marca aparece **uma vez**, com a lista das N aprovações.

## Behavior
- A agregação é só leitura: não cria, não altera e não remove nenhuma `Application`.
- Uma creator só aparece aqui enquanto tiver **pelo menos uma** `Application` com
  `status=APPROVED` numa campanha da marca. Se todas as aprovações dela forem revertidas (hoje
  isso não é possível — não existe transição de volta a partir de `APPROVED`, ver
  `applications-pipeline`), ela deixaria de aparecer — comportamento derivado, não um caminho
  testado hoje.
- Ordenação: creator com a aprovação mais recente primeiro (`reviewedAt` desc da aprovação mais
  recente entre as dela).
- O botão de WhatsApp só aparece quando o telefone da creator (`Influencer.phone`, texto livre
  sem código de país) puder ser convertido num número válido: 10 ou 11 dígitos após remover tudo
  que não é dígito (DDD + telefone brasileiro sem `+55`) recebem o prefixo `55`; 12 ou 13 dígitos
  já começando com `55` são usados como estão; qualquer outra contagem de dígitos não produz
  link — o botão não é renderizado, nunca um link quebrado.

## API / Interfaces
Ver `applications-pipeline` → API / Interfaces para o contrato completo do controller. Este
endpoint específico:

| Método | Rota | Guard/Role | Saída |
|---|---|---|---|
| GET | `/applications/approved` | `JwtAuthGuard` + `RolesGuard('BRAND')` | `Array<{ influencer, approvals: [{ applicationId, campaignId, campaignTitle, reviewedAt }] }>` |

`influencer` usa o mesmo shape de `influencerSelect` (nome, telefone, @handle, nichos, cidade,
seguidores, engajamento, posts recentes, foto, status do fetch de IG) já exposto na Fila.

## UI Behavior
- Nav da marca ganha um 4º item, "Creators" (`/brand/creators`).
- Lista + placa: linha por creator (nome, avatar, "N candidatura(s) aprovada(s)") e uma placa de
  detalhe com o media kit completo da creator selecionada + o botão de WhatsApp. No mobile, a
  lista vem antes da placa no DOM (mesmo padrão da aba Entregas) — tocar numa linha atualiza uma
  placa que já está no campo de visão, sem navegação de página.
- A placa mostra o telefone como link `tel:` abaixo do @handle (mesma linha de contato da placa
  da Fila). Sem telefone, no lugar do link aparece "Telefone não informado" — a ausência do botão
  de WhatsApp precisa ter um motivo visível, senão parece defeito da tela. Desde 2026-09-02 toda
  creator nova tem telefone (o cadastro direto passou a pedir, e o Perfil permite editar — ver
  `creator-account`); quem se cadastrou antes disso segue sem, até entrar no Perfil por conta
  própria.
- Seguidores aparecem no formato compacto ("5,4M", "8,2k"), o mesmo de `formatNumberParts` já
  usado na Fila e no perfil público — o número cru de uma conta com milhões de seguidores estoura
  a meia largura da placa e sai cortado.
- Copy da tela nunca concorda com o gênero de quem se candidatou: a concordância é com a palavra
  "candidatura" ("1 candidatura aprovada"), nunca com a creator ("aprovada em 1 campanha").
- Vazio: nenhuma creator aparece até a marca ter pelo menos uma aprovação em qualquer campanha.
- Erro de rede: mensagem de erro (`text-destructive`), sem botão de retry manual — mesmo padrão
  do `DashboardPage` (não é um padrão novo desta tela). React Query tenta de novo sozinho segundo
  a config default; navegar pra fora e voltar também refaz a busca.

## Acceptance Criteria
- [x] Marca sem nenhuma candidatura aprovada vê o estado vazio, não um erro.
- [x] Creator aprovada em duas campanhas da mesma marca aparece uma única vez, com as duas
      aprovações listadas.
- [x] Candidatura aprovada de outra marca nunca aparece na lista.
- [x] Candidatura `PENDING`/`REJECTED`/`WITHDRAWN` nunca aparece, mesmo sendo da própria marca.
- [x] Lista vem ordenada pela aprovação mais recente primeiro.
- [x] Botão de WhatsApp aparece só quando o telefone produz um link válido; ausente (não
      quebrado) quando o telefone é nulo ou tem contagem de dígitos que a heurística não cobre.
- [x] Telefone existente aparece na placa como link `tel:`; telefone ausente vira o texto
      "Telefone não informado" em vez de nada.
- [x] Contagem de seguidores acima de mil é abreviada, nunca renderizada crua.
- [x] Nenhum texto da tela assume o gênero de quem se candidatou.
- [x] Usuário autenticado sem perfil de marca recebe `403` ao chamar o endpoint.

## Error Scenarios
- Usuário sem perfil de marca → `403`, mesma mensagem de `findBrandOrFail` já usada em
  `campaigns.service`/`rewards.service`.
- Falha de rede no frontend → mensagem de erro (sem retry manual, ver "UI Behavior"); nenhuma
  escrita envolvida, então não há cenário de dado parcial.

## Known Gaps
- **Sem paginação.** Endpoint devolve todas as creators aprovadas da marca de uma vez. Aceitável
  na escala atual (0 marcas reais; mesmo uma marca real teria dezenas, não milhares, de
  aprovações) — revisitar se isso mudar. Não é bug, é escopo deliberadamente cortado — registrado
  aqui pra não ser confundido com esquecimento.
- **Heurística de telefone assume Brasil.** `Influencer.phone` é texto livre validado só por
  formato genérico (`PublicApplyDto`), sem código de país. A conversão pra link de WhatsApp
  assume DDD+número brasileiro (10-11 dígitos) na ausência de `55` explícito. Se o produto algum
  dia aceitar creator fora do Brasil, essa heurística quebra silenciosamente (produziria um
  número errado, não um erro visível) — `UNKNOWN` se isso já aconteceu com alguma creator real
  hoje, porque não há evidência de conta fora do Brasil no produto.
- **Nenhuma marca real usou isto ainda** — herdado do veredito `DEPOIS` do `/feature`. Tratar
  qualquer suposição sobre "a marca usa isso com frequência" como não confirmada até haver
  entrevista ou uso real.

## Test Coverage
- [x] `applications.service.approved.spec.ts` — vazio; agregação de 2 aprovações da mesma
      creator; isolamento entre marcas (filtro por `brandId`); exclusão de status não-`APPROVED`
      (via `where`); ordenação (preserva a ordem vinda do banco); `403` sem perfil de marca.
      7 testes.
- [x] `whatsappLinkFromPhone` (`format.spec.ts`) — 10/11 dígitos sem DDI, 12/13 com `55`, contagem
      inválida → `null`, telefone ausente → `null`, nunca produz caractere não-dígito. 6 testes.
- [x] `ApprovedCreatorsPage.spec.tsx` — empty state, erro, lista + placa abrindo a primeira
      creator, contagem de candidaturas aprovadas por creator, seleção troca a placa, botão de
      WhatsApp presente com o `href` certo / ausente sem telefone, telefone como link `tel:`,
      "Telefone não informado" sem telefone, seguidores abreviados, copy sem gênero de pessoa.
      11 testes — os 4 últimos validados por mutação (desligar a correção no componente faz o
      teste falhar).
- [ ] Teste de guard do endpoint no controller dedicado (mesmo padrão de
      `auth.controller.guards.spec.ts`) — não escrito; o guard segue o mesmo `@UseGuards` já usado
      em todas as outras rotas `BRAND` do controller, sem teste dedicado por rota (convenção atual
      do módulo `applications`, não uma lacuna nova desta feature).
- [ ] `useApprovedCreators` — sem teste de wiring isolado; coberto indiretamente pelos testes de
      `ApprovedCreatorsPage` (que mockam o hook). Mesmo padrão de risco aceito em outros hooks
      dedicados do projeto.

## Current Implementation
- Agregação por `influencerId` feita em memória, depois de uma única query
  (`application.findMany` com `include` de `influencer`/`campaign`) — não é `groupBy` no banco,
  porque a lista de aprovações por creator (não só a contagem) precisa vir junto.
- `findBrandOrFail` privado em `ApplicationsService`, duplicando o mesmo helper que já existe em
  `campaigns.service.ts`/`rewards.service.ts` (padrão do projeto: helper pequeno por módulo, não
  compartilhado).
- Frontend: `pages/brand/ApprovedCreatorsPage.tsx` reaproveita `KineticPlate`, `KineticRow`,
  `KineticActions` (que já tem suporte a `href`+`icon`, usado no CTA de WhatsApp da landing),
  `ThumbGrid`, `StatFigure` e `EmptyState` — nenhum primitivo novo.
- `whatsappLinkFromPhone` em `utils/format.ts`, ao lado de `creatorAvatarSrc`/`creatorPostSrc`.

## Change History
- 2026-09-02 · O telefone deixou de ser exclusivo do apply público: o cadastro de creator passou
  a exigi-lo e o Perfil a permitir editá-lo (`creator-account`). Nada muda nesta capacidade além
  de "Telefone não informado" deixar de ser o caso comum com o tempo.
- 2026-09-02 · Correções da 1ª conferência em produção (reportadas pelo Pedro). (1) **Copy no
  feminino** — "Todas as creators já aprovadas", "Nenhuma creator aprovada ainda", o `aria-label`
  "Creators aprovadas" e o rótulo "Aprovada em N campanhas" assumiam o gênero de quem se
  candidatou; toda a tela passou a concordar com "candidatura". (2) **Seguidores cortados** — a
  placa renderizava `followersCount` cru; conta de milhões (5,4M) estourava a meia largura em
  display 36px. Passou a usar `formatNumberParts`, como a Fila. (3) **Telefone invisível** — a
  placa nunca mostrou o telefone, só o botão de WhatsApp, que por sua vez não aparece quando
  `phone` é nulo (o caso da maioria das creators hoje): a tela ficava sem nenhum sinal de
  contato e sem explicar por quê. Agora mostra o link `tel:` ou "Telefone não informado".
  (4) Subtítulo "Todas as creators já aprovadas, em qualquer campanha, num lugar só" removido a
  pedido do Pedro — o `<h1>` e o contador da lista já dizem o que a tela é.
- 2026-09-02 · Implementado conforme desenhado (TDD): endpoint + service (7 testes), página +
  hook + util (13 testes web). `WhatsAppIcon` — que já existia como SVG local da landing (o
  `lucide-react` não tem glifos de marca) — foi promovido pra
  `components/primitives/WhatsAppIcon.tsx` e passou a ser compartilhado entre a landing e esta
  capacidade, em vez de duplicado. Nav da marca ganhou o 4º item "Creators". No mesmo passo, o
  Pedro pediu o mesmo ícone (canto superior direito) também na placa/foto da Fila — ver
  `campaign-fila-review` → Change History; os dois pontos usam o mesmo `whatsappLinkFromPhone`.
- 2026-09-02 · Criação. Desenhado no `/architect` a pedido do Pedro, que optou por seguir com a
  visão dedicada apesar do veredito `DEPOIS` do `/feature` na mesma data — decisão dele de
  construir na frente da evidência, com o escopo do chat cortado por contrariar `D-08`.
