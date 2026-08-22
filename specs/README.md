# specs/ — comportamento vivo do TAYRO

Cada `specs/<slug>/spec.md` descreve o comportamento **atual** de uma capacidade de domínio —
não o histórico do que foi entregue (isso é `CLAUDE.md` → "Feito") e não a estratégia por trás
(isso é `.claude/knowledge/`, com tag de evidência). É a terceira categoria:

| Arquivo | Responde | Muda quando |
|---|---|---|
| `.claude/knowledge/` | Por que construir isso (visão, cliente, concorrência) | evidência nova |
| `CLAUDE.md` | Como construir em geral (stack, convenções, footguns) | convenção muda |
| `specs/<slug>/spec.md` | O que esta capacidade faz, especificamente, agora | comportamento muda |

Estas specs são pensadas pra servir de **contexto pra humano e pra agente** (Claude Code
incluído) entender uma capacidade antes de mexer nela — sem depender só de ler o código. Isso só
funciona se a spec separar com rigor **o que o sistema deve garantir** (requisito) de **como o
código de hoje faz isso** (implementação), e for honesta sobre o que é lacuna em vez de fingir
que é comportamento pretendido.

## A regra que torna isto "vivo"

**Editar a spec é o pedido de mudança.** Não é documentação que se atualiza depois do código —
é o inverso: quando você quer que a Fila de aprovação aceite um motivo obrigatório de recusa,
por exemplo, você edita `specs/content-submissions/spec.md` (seções "Behavior" e "Acceptance
Criteria") primeiro, e a implementação segue o que a spec passou a dizer.

Nem toda seção muda no mesmo ritmo:
- **`Objective`** — muda raramente, só se a própria razão de existir da capacidade for
  reinterpretada (é o equivalente, por capacidade, do que `vision.md` é pro produto inteiro).
- **`Scope` / `Out of Scope` / `Domain` / `Behavior` / `API / Interfaces` / `UI Behavior` /
  `Acceptance Criteria` / `Error Scenarios`** — vivas. Editar aqui é pedir mudança de
  comportamento.
- **`Known Gaps` / `Test Coverage` / `Current Implementation`** — refletem a realidade de
  engenharia de agora. Não são "requisito", são fato observado; mudam quando o código muda (ou
  quando alguém verifica de novo e encontra algo diferente do que a spec dizia).
- **`Change History`** — append-only, uma linha por mudança relevante.

## Template

```markdown
---
slug: <slug>
status: ACTIVE
origin: RETROFIT | FEATURE
source_of_truth: production_code | product_decision
last_updated: YYYY-MM-DD
implements:
  - caminho/do/arquivo/ou/endpoint
related_decisions: [D-05]   # opcional, referencia decisions.md
---

# <Nome da capacidade>

## Objective
O que esta capacidade resolve e por que existe. Em specs `FEATURE`, é o veredito do
`/feature` (problema, persona, hipótese). Em specs `RETROFIT`, diga isso explicitamente — não
finja um processo de aprovação que não aconteceu.

## Scope
O que está incluído nesta capacidade.

## Out of Scope
O que deliberadamente não faz parte — inclui decisões de "não construir agora" e o que outra
spec cobre (linkar pelo slug em vez de duplicar).

## Domain
Conceitos, entidades, relações e invariantes. O que é verdade sempre, não o que muda por
transição.

## Behavior
Comportamento funcional que o sistema deve garantir: regras de negócio, máquina de estados,
efeitos colaterais (best-effort vs. bloqueante). Descreva o QUE, não o COMO — nome de método,
ORM, lib interna vai em "Current Implementation".

## API / Interfaces
Endpoints (método, rota, guard, role), inputs, outputs, códigos de erro. Contrato observável,
não implementação de handler.

## UI Behavior
Só comportamento de frontend com relevância funcional (o que aparece, quando, o que cada ação
faz). Detalhe puramente visual (cor, espaçamento) não entra aqui — isso é design system.
Omitir a seção inteira se a capacidade não tiver frontend próprio.

## Acceptance Criteria
Critérios verificáveis, checklist. `- [x]` = verificado contra código/teste real hoje.
`- [ ]` = deveria ser verdade e não é (linka pra "Known Gaps") — nunca use `[ ]` pra
"não conferi".

## Error Scenarios
Cenários de erro com o comportamento esperado (código HTTP, mensagem, o que NÃO deve acontecer
— ex.: "nenhum registro parcial é criado").

## Known Gaps
Bug, dívida técnica, limitação conhecida, estado inalcançável, decisão pendente. **Nunca**
comportamento desejado — se está aqui, é porque não deveria ser assim, ou porque ninguém
decidiu ainda. Marque o que não tem evidência suficiente como `UNKNOWN`.

## Test Coverage
O que já tem teste (arquivo real, `- [x]`) e o que deveria ter e não tem (`- [ ]`). Não é a
especificação — é o retrato de cobertura. Lacuna aqui pode ou não ser um Known Gap (falta de
teste de algo trivial não é bug; falta de teste de algo com race condition, é).

## Current Implementation
Só o que é necessário pra mexer no código com segurança e que não é requisito: ORM usado,
organização de módulo, nome de service/arquivo além do que já está em `implements`, comentário
de código que explica um workaround não-óbvio. Se remover esta seção não tornasse a spec menos
capaz de definir comportamento corretamente, ela pertence aqui.

## Change History
- YYYY-MM-DD · o que mudou · por quê
```

Nem toda seção é obrigatória em toda spec — capacidade simples não precisa de "UI Behavior" se
não tem frontend próprio, nem de "Error Scenarios" se não há cenário de erro relevante além do
óbvio. Proporção ao tamanho real da capacidade: não adicione seção vazia só pra seguir o molde.

## Quem escreve

O agente `architect` (via `/architect`) cria e atualiza os arquivos — nunca escreva
"Behavior"/"API"/"Acceptance Criteria" que não bate com o código real, isso é pior que não ter
spec nenhuma. Duas entradas:
- **Capacidade nova:** exige veredito `AGORA` do `/feature` primeiro (como hoje). `/architect`
  cria `specs/<slug>/spec.md` com `origin: FEATURE`.
- **Capacidade existente:** editar a spec (ou pedir pro `/architect` desenhar a mudança) não
  exige passar pelo `/feature` de novo — é exatamente o atalho que faz isto valer a pena.
  Continua bloqueado por decisão `ABERTA` em `decisions.md`.

`/review` confere deriva: se o diff muda comportamento descrito numa spec sem atualizá-la, isso
é achado de revisão, não só o código.

## Regras de conteúdo (não negociar ao escrever ou editar uma spec)

1. **Requisito ≠ implementação.** "User e Brand são criados atomicamente" é `Behavior`.
   "`prisma.$transaction` com create aninhado" é `Current Implementation`. Se uma frase cita
   nome de método/ORM/arquivo no meio de uma regra de negócio, ela está na seção errada.
2. **Não inventar requisito.** Specs de sistema existente (`origin: RETROFIT`) descrevem o que
   o código comprovadamente faz — não o que "faria sentido" fazer. Sem evidência (código, teste,
   ou decisão registrada) → marcar `UNKNOWN`, `GAP` ou `TODO`, nunca preencher com plausibilidade.
3. **Bug documentado é bug, não comportamento.** Se o código faz algo por acidente (não por
   decisão), isso é `Known Gaps`, mesmo que seja o que acontece hoje. Confundir os dois é o erro
   mais caro que uma spec pode cometer — vira "documentação" que blinda o bug.
4. **Lista de `.spec.ts` não é a especificação.** `Test Coverage` registra o que existe.
   `Acceptance Criteria` registra o que deve ser verdade. Um teste existir não prova que o
   critério é o certo; um critério existir não prova que há teste.
5. **Rastreabilidade sempre.** `implements:` aponta pra onde o comportamento vive no código —
   é o que permite navegar spec → código → teste. Se um endpoint/arquivo citado no corpo da spec
   não está em `implements:`, adicione.
