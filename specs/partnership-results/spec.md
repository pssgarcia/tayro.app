---
slug: partnership-results
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-03
implements:
  - apps/api/prisma/schema.prisma (model PartnershipResult)
  - apps/api/src/modules/partnerships/presentation/partnership-results.controller.ts
  - apps/api/src/modules/partnerships/application/partnership-results.service.ts
  - apps/api/src/modules/partnerships/application/dtos/create-partnership-result.dto.ts
  - apps/api/src/modules/partnerships/application/dtos/update-partnership-result.dto.ts
  - apps/api/src/modules/partnerships/application/dtos/set-result-visibility.dto.ts
  - apps/api/src/modules/creators/application/creators.service.ts (getPublicProfile)
  - apps/api/src/modules/email/email.service.ts (sendPartnershipResult)
  - apps/web/src/pages/brand/CampaignResultsTab.tsx
  - apps/web/src/pages/influencer/PartnershipResultsSection.tsx
  - apps/web/src/pages/public/PublicCreatorProfilePage.tsx
  - apps/web/src/hooks/usePartnershipResults.ts
related_decisions: [D-21, D-D, D-06, D-08]
---

# Resultado de parceria (histórico verificado + transparência bilateral)

## Objective
Fecha a **maior lacuna entre o que o produto diz que é e o que ele é**: dos quatro diferenciais
de `positioning.md`, o nº 2 ("histórico verificado e portátil") e o nº 3 ("transparência
bilateral — a marca devolve resultado pra creator") eram promessa de pitch, não produto. O
modelo `PartnershipResult` existia no schema desde a origem e **nenhum código do repositório
escrevia nele**; o perfil público devolvia `results[]` sempre vazio e a página nunca renderizava
esse campo.

Era o item **2 do AGORA** em `roadmap.md`, bloqueado por `D-D` (ABERTA) — "o que exatamente é
histórico verificado". `D-D` foi decidida pelo Pedro em 2026-09-03 e registrada como `D-21`;
esta capacidade é a implementação dessa decisão.

O que a capacidade entrega, em uma frase: **a marca informa o que a parceria deu, a creator
sempre vê, e o histórico só vai pra vitrine pública com o consentimento dos dois lados.**

## Scope
- Registro, correção e remoção do resultado de uma parceria pela marca dona da campanha.
- Leitura pelo lado da creator, sem filtro, com aviso por e-mail quando um resultado é
  registrado.
- Controle da creator sobre o que aparece no próprio perfil público, resultado a resultado.
- Exibição do histórico em `/c/:handle`, com a regra de contagem dita em público.

## Out of Scope
- **Medir alcance de verdade.** Nada aqui é coletado do Instagram: os números são digitados
  pela marca. Métrica real de alcance exigiria a API oficial do Instagram com OAuth da creator
  — ver `instagram-sync` → Known Gaps e o registro em `roadmap.md`.
- **Relatório agregado / analytics** (evolução da creator, comparação entre campanhas):
  `D-08`, fora do MVP. Esta capacidade cria o dado que um dia alimentaria isso.
- **Nota da creator sobre a marca** (a outra direção da bilateralidade). Não existe e não foi
  avaliada — ver Known Gaps.
- Ciclo de vida da candidatura (`applications-pipeline`), revisão de conteúdo
  (`content-submissions`), pagamento (`rewards`), e a regra de acesso do perfil público
  (`public-creator-profile`).

## Domain
`PartnershipResult` tem relação **1:1 opcional** com `Application`: uma parceria tem no máximo
um resultado, e a unicidade é garantida pelo banco (`applicationId` é único), não por leitura
prévia no serviço.

Conteúdo do resultado: `reach`, `impressions`, `couponsUsed` (inteiros não-negativos, todos
opcionais) e `note` (texto livre). **Ao menos um deles precisa ter valor** — um registro vazio
faria a parceria contar como concluída sem dizer nada.

Visibilidade em três camadas, e é aqui que mora a decisão de `D-21`:

| Quem | Vê o quê | Governado por |
|---|---|---|
| Marca | tudo que ela mesma registrou | ser dona da campanha |
| Creator | **sempre** o resultado inteiro, inclusive os dois flags | nada — registrar é devolver |
| Público (`/c/:handle`) | só com os DOIS consentimentos | `brandAllowsPublic` **e** `!hiddenByCreator` **e** `publicProfileEnabled` |

- `brandAllowsPublic` (default `false`) — consentimento da marca. Alcance e cupons são dado
  comercial dela, e `/c/:handle` é página aberta e indexável.
- `hiddenByCreator` (default `false`) — **opt-out** da creator, item a item. O consentimento
  base de publicar continua sendo o `publicProfileEnabled` dela (`D-06`); este campo existe pra
  ela não precisar desligar o perfil inteiro por causa de um resultado.

**Não existe flag que esconda o resultado da creator.** O antigo `visibleToCreator` (default
`false`) foi removido do schema: gatear a visão dela era o oposto exato do diferencial nº 3, e
na prática deixaria a transparência como um opt-in que ninguém liga.

### O que "verificado" significa aqui (`D-21`, e o limite do `vision.md` nº 5)
Duas coisas distintas, que a interface nunca mistura:

1. **A contagem** de "parcerias concluídas" é uma **regra pública e computável**: candidatura
   aprovada que tenha conteúdo aprovado pela marca **ou** resultado informado por ela. As duas
   metades são atos da marca — nenhuma é auto-declarada pela creator. A regra é dita na própria
   página, não escondida.
2. **Os números** (alcance, impressões, cupons) são **declarados pela marca** e aparecem sempre
   com o nome de quem os informou. Não são medidos por nós e nenhuma superfície os apresenta
   como métrica verificada. O ato de registrar É a atestação — não existe passo extra de
   "concluir parceria" (avaliado e recusado em `D-21`: adicionaria trabalho manual à marca, o
   oposto do critério de admissão nº 1 do roadmap).

Consequência aceita: um resultado registrado entra na contagem **mesmo sem consentimento de
vitrine**. A contagem é agregada e não revela marca, número nem nota; amarrá-la ao consentimento
deixaria o histórico da creator refém de a marca lembrar de marcar uma caixa.

## Behavior

### Registrar
Só a marca dona da campanha, e só sobre candidatura **`APPROVED`** — parceria não existe sem
aprovação. Publicar é escolha ativa no ato do registro: ausente, o consentimento é `false`.

Efeito colateral **best-effort**: a creator é avisada por e-mail de que a marca registrou o
resultado (o e-mail não repete os números; convida a abrir o registro dela). Falha de e-mail
**nunca** desfaz nem impede o registro já gravado — e a exceção não sobe, senão a marca receberia
erro numa operação que deu certo e registraria de novo.

### Corrigir
A marca pode editar os números, a observação e o consentimento de publicação a qualquer momento
— resultado chega tarde e chega errado. `applicationId` **não** é editável: mover um resultado
de uma creator pra outra não é correção, é reescrever histórico de duas pessoas. A regra de
"ao menos um campo com conteúdo" vale sobre o estado **depois** da edição.

### Remover
Permitido a qualquer momento pela marca dona, sem gate de status — diferente de `rewards`, onde
apagar depois de `ISSUED` é proibido. O motivo da diferença: resultado atribuído à creator
errada precisa de saída, e o dado é declaração da marca sobre a própria campanha. A consequência
(a creator já foi avisada, e o resultado pode já estar no perfil público dela) é dita na
confirmação da interface, não silenciada.

### Ver (creator)
Sem filtro nenhum. A creator recebe também os dois flags de visibilidade: ela precisa saber que
existe um resultado que a marca escolheu **não** liberar — essa é a metade da transparência que
o produto devia a ela.

### Publicar / esconder (creator)
A creator liga e desliga cada resultado no próprio perfil. Essa rota nunca altera o consentimento
da marca, e a marca nunca altera o da creator.

## API / Interfaces

Todas as rotas exigem autenticação (guard de JWT na classe) e papel explícito.

| Método | Rota | Papel | Notas |
|---|---|---|---|
| `POST` | `/partnership-results` | BRAND | `applicationId` + conteúdo. `201`. |
| `PATCH` | `/partnership-results/:id` | BRAND | Campos parciais, sem `applicationId`. |
| `DELETE` | `/partnership-results/:id` | BRAND | `204`. |
| `GET` | `/partnership-results/campaign/:campaignId` | BRAND | Parcerias aprovadas da campanha + `result` ou `null`. |
| `GET` | `/partnership-results/mine` | INFLUENCER | Resultados da própria creator, achatados com marca e campanha. |
| `PATCH` | `/partnership-results/:id/visibility` | INFLUENCER | `{ hidden: boolean }`. |

`GET /creators/:handle/public` (ver `public-creator-profile`) passa a devolver em `results[]`
apenas o que tem os dois consentimentos, cada item com `brandName` e `campaignTitle`. Os flags
de consentimento **não** saem nessa resposta: são controle, não conteúdo do histórico.

Tetos de entrada: `note` até 1000 caracteres; métricas entre `0` e `2.000.000.000` e inteiras.
O teto numérico não é opinião sobre alcance plausível — a coluna é `int4`, e um número acima
disso viraria erro de banco (`500`) em vez de `400` apontando o campo.

## UI Behavior

### Marca — aba "Resultado" em `/brand/campaigns/:id`
Quinta aba, fechando o ciclo na ordem em que ele acontece: escolher (Fila) → combinar (Briefing)
→ receber (Entregas) → pagar (Pagamento) → informar o que deu (Resultado).

Par lista + placa, o mesmo de Entregas e da Fila. A lista mostra **toda** parceria aprovada,
inclusive as sem resultado — são elas o trabalho a fazer, e aparecem como "A informar". Filtros:
todas / a informar / informadas. A seleção acompanha o filtro: informar um resultado move a
parceria de um filtro pro outro, e a placa passa pra primeira que restou.

A placa da parceria sem resultado explica o que está em jogo (é o que transforma candidatura
aprovada em histórico, e a única forma de a creator saber o resultado do trabalho dela). Com
resultado, mostra **só as métricas informadas** — métrica ausente não vira `0` nem `—` —, a
observação, "informado por você em <data>" e o estado de publicação, incluindo o caso em que a
marca liberou e **a creator escolheu não mostrar**.

O formulário tem os três números, a observação (com aviso explícito de que a creator vai ler) e
o interruptor de publicação, que **nasce desligado**. Salvar exige ao menos um campo com
conteúdo, a mesma regra da API. Apagar passa por confirmação que diz a consequência — no padrão
do `WithdrawModal` — e sugere corrigir editando em vez de apagar.

Uma linha de honestidade fica visível na aba: os números são informados pela marca, o tayro não
mede alcance.

### Creator — seção no Registro (`/influencer/applications`)
Abaixo da lista de candidaturas, porque a lista é o presente e o histórico é o acumulado. Não
ocupa espaço nenhum quando nenhuma marca informou nada.

Cada resultado mostra marca, campanha, métricas informadas, a observação e "informado por
<marca> em <data>". Abaixo, o controle de vitrine em três estados:
- marca não liberou → texto explicando que o resultado fica só entre as duas (sem ação);
- liberado e visível → "Ocultar do meu perfil";
- liberado e escondido → "Mostrar no meu perfil".

Se o resultado está marcado como visível mas o **perfil público dela está desligado**, a seção
diz isso e aponta pro Perfil — senão a tela prometeria uma vitrine que devolve `404` pra
qualquer visitante (a mesma guarda que o link do perfil público já aplica).

### Público — `/c/:handle`
Seção "Histórico de parcerias" **antes** do feed do Instagram: feed qualquer perfil tem, isto só
existe aqui. Cada parceria é um bloco com marca, campanha, métricas informadas, a observação e a
atribuição a quem informou. Sem parceria publicada, a seção não aparece.

Sob a contagem de "parcerias concluídas", a regra de cálculo aparece em texto — e só quando a
contagem é maior que zero.

## Acceptance Criteria
- [x] Resultado só pode ser registrado sobre candidatura `APPROVED` de campanha da própria marca.
- [x] Uma parceria não pode ter dois resultados, e a garantia é a constraint do banco — sem
      leitura prévia (nenhuma janela entre checar e escrever).
- [x] Registro sem nenhum número e sem observação é recusado, no create e no update.
- [x] `brandAllowsPublic` é `false` quando a marca não escolhe explicitamente publicar.
- [x] Observação em branco é gravada como `null`, nunca string vazia.
- [x] A creator recebe o resultado inteiro independentemente de `brandAllowsPublic`.
- [x] A creator sabe, pela interface, quando a marca não liberou um resultado pra vitrine.
- [x] A creator consegue esconder e mostrar cada resultado no próprio perfil, e essa ação não
      toca no consentimento da marca.
- [x] `/c/:handle` nunca publica resultado sem os dois consentimentos.
- [x] `/c/:handle` não expõe os flags de consentimento.
- [x] Todo número exibido — nas três superfícies — vem acompanhado de quem o informou.
- [x] A regra de contagem de parcerias concluídas aparece em texto na página pública.
- [x] Falha no envio do e-mail não impede o registro nem devolve erro pra marca.
- [x] A creator é avisada por e-mail quando um resultado é registrado.
- [x] Nenhuma rota da capacidade é pública, e papel errado não alcança rota de outro papel.
- [x] A listagem de parcerias da campanha não arrasta o feed de posts do Instagram.
- [x] Perfil + parcerias + resultados continuam saindo numa única query no perfil público.
- [ ] A creator não tem como pedir o resultado de uma parceria que a marca nunca informou —
      ver Known Gaps.

## Error Scenarios
- Registrar sobre candidatura inexistente → `404`.
- Registrar sobre candidatura de campanha de outra marca → `403`, e nada é criado.
- Registrar sobre candidatura não aprovada → `400`, e nada é criado.
- Registrar quando já existe resultado → `409`, com mensagem que aponta pra editar o existente.
- Registrar/editar sem número nem observação → `400`.
- Métrica negativa, fracionada ou acima do teto do inteiro → `400` no campo, nunca `500`.
- Editar/apagar resultado de outra marca → `403`, e nada muda.
- Creator alterando visibilidade de resultado de outra creator → `403`.
- Falha do provedor de e-mail → resultado permanece gravado, `201` normal, aviso em log.

## Known Gaps
- **A creator não tem como cobrar um resultado.** Se a marca nunca informa, a parceria fica sem
  histórico e a creator não tem nenhuma ação — nem um "pedir resultado" nem visibilidade de que
  a marca ainda deve. Foi decisão de escopo (`D-21` respondeu "o que acontece se a marca não
  confirmar" com "nada acontece — sobra a contagem"), não esquecimento. Reavaliar quando houver
  marca real operando.
- **Bilateralidade só num sentido.** A creator não avalia a marca nem registra nada sobre a
  parceria. Nunca foi avaliado em `/feature`; entra na discussão de reputação de marca, que não
  existe no produto.
- **Números não são verificáveis por ninguém.** A marca pode informar qualquer valor. Isto é
  consciente e é o motivo de toda superfície atribuir o número a ela em vez de apresentá-lo como
  métrica do tayro (`vision.md` nº 5). Verificação real dependeria da API oficial do Instagram
  (`instagram-sync` → Known Gaps).
- **Sem histórico de edição.** Corrigir um número sobrescreve o anterior, e a creator — que já
  foi avisada do primeiro valor — não vê que houve mudança. `updatedAt` existe no dado, mas
  nenhuma superfície o mostra.
- **`CampaignStatus.COMPLETED` continua inalcançável.** Informar o resultado de todas as
  parcerias seria o gatilho natural pra essa transição, e ela continua não existindo (registrado
  em `campaign-lifecycle` e no `CLAUDE.md`).
- **`PartnershipResult` era um dos três modelos sem superfície** citados no `CLAUDE.md`. Os
  outros dois seguem mortos: `Notification` (tabela órfã, coerente com `D-08`) e o `results[]`
  que a creator não usa... este último deixa de ser gap com esta entrega.

## Test Coverage
- `apps/api/src/modules/partnerships/application/partnership-results.service.spec.ts` — 33
  casos: [x] create (sucesso, consentimento default e explícito, e-mail disparado, e-mail que
  falha não derruba, nota vazia→null, registro vazio, candidatura não aprovada, campanha alheia,
  candidatura inexistente, `P2002`→`409` com prova de que não há leitura prévia, e-mail não sai
  quando o registro falha); [x] update (campos parciais, liga/desliga publicação, recusa
  esvaziar, dono, inexistente); [x] remove (dono); [x] findByCampaign (parceria com e sem
  resultado numa única query, filtro de aprovadas, sem `igRecentPosts` na listagem, dono,
  campanha inexistente); [x] findMine (shape achatado, ausência de filtro de visibilidade
  — validado inspecionando o `where` real —, flags expostos, sem perfil de creator);
  [x] setVisibility (esconder, mostrar, creator alheia, não mexe no flag da marca, inexistente).
- `apps/api/src/modules/partnerships/presentation/partnership-results.controller.guards.spec.ts`
  — [x] JWT cobre a classe inteira; [x] `RolesGuard` em todas as 6 rotas; [x] papel exato por
  rota (creator não escreve o próprio histórico, marca não decide a vitrine de ninguém).
- `apps/api/src/shared/validation/dto-maxlength.spec.ts` — [x] `note` acima de 1000, métrica
  acima do teto do `int4`, negativa e fracionada.
- `apps/api/src/modules/creators/application/creators.service.race.spec.ts` — [x] resultado
  publicado com marca e campanha; [x] filtro dos dois consentimentos (um teste por flag);
  [x] flags não expostos; [x] as quatro combinações da regra de contagem; [x] contagem inclui
  resultado não-público; [x] `404` uniforme entre handle inexistente e perfil privado (fechou
  um Known Gap antigo de `public-creator-profile`); [x] query única (guarda de N+1).
- `apps/web/src/pages/brand/CampaignResultsTab.spec.tsx` — 19 casos, incluindo [x] a linha de
  honestidade sobre a origem do número, [x] métrica ausente não virando `0`, [x] consentimento
  nascendo desligado, [x] campo vazio virando `null`, [x] edição usando update e não create,
  [x] a confirmação de apagar dizendo a consequência.
- `apps/web/src/pages/influencer/MyApplicationsPage.spec.tsx` — [x] seção ausente sem
  resultado; [x] resultado com atribuição; [x] creator vê mesmo sem liberação da marca e sabe
  disso; [x] esconder/mostrar; [x] aviso de perfil público desligado.
- `apps/web/src/pages/public/PublicCreatorProfilePage.spec.tsx` — [x] histórico renderizado
  (nunca era, antes desta entrega); [x] atribuição; [x] métrica ausente; [x] seção ausente sem
  parceria; [x] regra de cálculo em texto, e só quando a contagem é maior que zero.
- `apps/web/src/components/primitives/kinetic/KineticToggle.spec.tsx` — [x] estado como
  `switch`/`aria-checked`, não só cor.
- [ ] Nenhum teste cobre a capacidade ponta a ponta com banco real (nenhuma capacidade do
  produto tem — não é dívida específica desta).

## Current Implementation
- Módulo `apps/api/src/modules/partnerships/` (Clean Architecture, espelhando `rewards`).
- Migration `20260903031650_partnership_result_visibility`: remove `visibleToCreator`, adiciona
  `brandAllowsPublic`, `hiddenByCreator` e `updatedAt`. O `DROP COLUMN` não descarta dado de
  ninguém — a coluna nunca teve escritor em nenhum ambiente, então a tabela está vazia em dev e
  em produção.
- `partnershipInfluencerSelect` é local e deliberadamente menor que o `influencerSelect` da
  Fila: sem `igRecentPosts`, porque roda pra toda parceria aprovada da campanha (mesmo motivo
  de `D-18`).
- `getPublicProfile` filtra e ordena os resultados em memória, a partir da mesma query única que
  já carregava perfil + parcerias.
- Frontend: hooks em `usePartnershipResults.ts`; `KineticToggle` novo em
  `components/primitives/kinetic/` (extraído do `Toggle` local do Perfil da creator, que passou
  a usá-lo, porque a placa clara do modal da marca precisava da variante); `StatusWord` ganhou
  `kind="partnershipResult"` e o vocabulário (`partnershipResultWord`) foi pra `utils/format.ts`
  junto dos outros cinco.
- O grupo de filtros da aba tem `role="group"` nomeado: a linha da lista (`KineticRow`) é um
  botão cujo nome acessível inclui o status, então sem isso filtro e linha ficam
  indistinguíveis pra leitor de tela.

## Change History
- 2026-09-03 · criação da capacidade, implementando `D-21` (que fecha `D-D`). Fecha os Known
  Gaps de `PartnershipResult` sem escritor em `applications-pipeline` e
  `public-creator-profile`, e o item 2 do AGORA em `roadmap.md`. Mudanças de comportamento em
  capacidade vizinha: `completedPartnerships` passou a contar também parceria com resultado
  informado (antes só conteúdo aprovado), e o perfil público passou a filtrar por
  `brandAllowsPublic && !hiddenByCreator` em vez do removido `visibleToCreator`.
