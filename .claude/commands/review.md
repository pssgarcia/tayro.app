---
description: Revisa o trabalho da branch atual em 5 eixos — código, UX, performance, consistência com o produto e deriva de spec.
argument-hint: [foco opcional — ex: "só performance" ou "só a tela nova"]
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Revise o que mudou nesta branch. Rode **nesta conversa** — a revisão precisa do contexto do que
acabou de ser construído.

## Primeiro, veja o que mudou de verdade

Rode `git diff main...HEAD --stat` e `git status`, e leia os arquivos alterados por inteiro
(não só o diff — o diff esconde o que quebrou em volta). Inclua arquivos não rastreados: neste
repo é comum a tela nova ainda não estar commitada.

Leia também `CLAUDE.md` (invariantes, footguns, telas prontas) e
`.claude/knowledge/vision.md` + `decisions.md`.

Identifique quais `specs/<slug>/spec.md` cobrem os arquivos tocados (o frontmatter `implements:`
de cada spec lista os arquivos-chave — `grep` por eles, ou por nome de pasta/rota, se o
`implements:` não bater exatamente) e leia essas specs inteiras antes de revisar.

Foco pedido (se houver): $ARGUMENTS

---

## Os 5 eixos

### 1. Código
- Faz o que diz? Caminho de erro tratado ou só o feliz?
- Duplicou algo que já existe? (`utils/format.ts` já tem `formatCurrency`, `formatDate`,
  `formatOffer`; `components/primitives/` já tem `Plate`, `StatusPill`, `ThumbGrid`, etc.)
- Testes cobrem **comportamento e gate de negócio**, ou só render com hook mockado?
  Hook mockado valida UI e não prova nada.
- Lint passa nos arquivos novos? (já mordeu duas vezes — o CI roda o lint inteiro)

### 2. UX
- Mobile-first de verdade? Testar mentalmente em **360px**, inclusive nas telas de marca —
  marca também é mobile aqui, não é desktop.
- Estados de carregando, vazio e erro existem? Estado vazio é parte do produto, não sobra.
- Alvo de toque ≥ 44px. Card, nunca tabela.
- Copy: encorajadora, sem gênero assumido, derivada do estado de domínio
  (ex.: "pagamento" vs "envio" conforme `offerType`) e não hardcoded.

### 3. Performance
- Query Prisma com `include`/`select` — algum N+1 entrou?
- Check-then-act fora de `$transaction()`? Race condition possível?
- No front: refetch desnecessário, lista sem `key` estável, imagem sem dimensão.

### 4. Consistência com o produto
- Contradiz algum "nunca" da `vision.md`?
- Contradiz alguma decisão de `decisions.md`? (`offer*` é fonte de verdade,
  `rewardType`/`rewardValue` deprecados; dinheiro em centavos; `publicProfileEnabled` default false)
- Isso **entrega o que a gente diz que entrega**? Se toca um dos 4 diferenciais, ele ficou mais
  verdadeiro ou só mais bonito?
- Escopo cresceu além do que o `/feature` aprovou?

### 5. Deriva de spec (`specs/<slug>/spec.md`)
- O código, depois da mudança, ainda bate com `Behavior`, `API / Interfaces` e `Acceptance
  Criteria` da spec correspondente? Divergência aqui é achado — a spec parou de ser confiável.
- O diff muda regra de negócio, endpoint, modelo ou máquina de estados que uma spec descreve,
  **sem atualizar a spec**? Isso é o caso mais comum e o mais importante de pegar: código sem
  spec atualizada volta a ser exatamente o problema que `specs/` existe pra resolver. Sinalize
  mesmo que o código em si esteja correto — falta o `/architect` passar e atualizar o arquivo.
- O diff corrige algo que a spec listava em `Known Gaps` ou `Test Coverage` (um `- [ ]`)? Se
  sim, a spec precisa marcar `- [x]` e mover a linha — gap resolvido documentado como gap ainda
  aberto é o erro inverso, igualmente enganoso.
- O diff introduz detalhe de implementação (nome de método, ORM, service) dentro de uma frase
  que deveria ser requisito em `Behavior`/`API / Interfaces`? Aponte a seção errada.
- Nenhuma spec cobre os arquivos tocados? Não é bloqueio (pode ser código genuinamente sem
  capacidade própria — util, config), mas vale mencionar como 🔵 se parecer que deveria existir.

---

## Formato da saída

Agrupe por severidade, mais grave primeiro. Para cada achado: arquivo:linha, o que quebra, e
**em que cenário concreto** quebra. Achado sem cenário de falha é opinião — corte.

```
🔴 Bloqueia merge   — quebra em produção, vaza dado, ou contradiz invariante
🟡 Corrigir antes   — dívida real que vai doer logo
🔵 Vale considerar  — melhoria, sem urgência
```

Termine com **uma linha** de veredito: pronto pra PR, ou o que falta.

Não conserte nada sem avisar. Liste primeiro; o Pedro decide o que entra.
Se não achar nada grave, diga isso — não invente achado pra parecer útil.
