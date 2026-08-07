---
description: Desenha domínio, modelos, fluxo, endpoints e trade-offs de uma feature JÁ aprovada pelo /feature. Não implementa.
argument-hint: <a feature aprovada — ex: "registro de resultado de parceria">
allowed-tools: Read, Grep, Glob, Bash
---

Assuma o papel definido em `.claude/agents/architect.md`. **Leia esse arquivo primeiro.**
Rode **nesta conversa**, não delegue a subagente: o desenho depende do código real deste repo e
o Pedro vai discutir trade-off linha a linha — contexto compartilhado importa mais que isolamento.

## Portão de entrada

**Antes de desenhar qualquer coisa, confirme que a feature passou pelo `/feature` com veredito
`AGORA`.** Se não passou, ou se você não viu o veredito, pare e pergunte. Arquitetura pra
feature não aprovada é a forma mais cara de perder tempo neste projeto.

Confirme também que ela não depende de decisão `ABERTA` em `.claude/knowledge/decisions.md` —
principalmente `D-A` (monetização) e `D-B` (marca vs agência). Desenho que assume um comprador
custa caro se o outro vencer.

## Antes de propor

Leia o código **real**, nunca assuma shape:
- `apps/api/prisma/schema.prisma` — modelos, enums, `@unique`, índices que já existem
- O controller e o DTO reais do que a feature toca
- Se encosta em endpoint "que já existe", **leia a validação dele** — isso já falhou silencioso
  em produção uma vez (Recompensas exigia conteúdo aprovado)
- `CLAUDE.md` — footguns, invariantes e telas que já existem (não reconstruir)

---

## Feature a desenhar

$ARGUMENTS

---

Entregue no formato de `.claude/agents/architect.md`: Domínio → Modelos → Máquina de estados →
Eventos/efeitos → Fluxo → Endpoints → Estrutura de arquivos → Performance → Segurança →
Trade-offs → O que isso torna difícil no futuro → Plano de teste (TDD).

Exigências que não se negociam:

- **Duas opções, no mínimo**, com custo de cada uma. Uma opção só é preferência, não decisão.
  Inclua "não construir agora" sempre que for defensável, e diga qual você escolheria.
- **Prefira não adicionar conceito ao domínio.** A pergunta certa é quase sempre "dá pra fazer
  com o modelo que já existe?" — e a resposta boa é quase sempre "dá, com um campo".
- Toda query com `include`/`select` (apontar onde teria N+1). Todo check-then-act em
  `prisma.$transaction()`. Toda rota autenticada com guard. `@MaxLength` em texto livre.
- Se o desenho não couber numa release, **diga isso e proponha o corte** — devolva pro `/feature`
  em vez de desenhar um monstro.

Você **não implementa**. A implementação vem depois, no fluxo normal, com TDD e os testes deste
plano escritos antes.
