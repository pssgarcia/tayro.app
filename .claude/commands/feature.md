---
description: Avalia uma ideia de feature como sócio de produto — problema, evidência, impacto, veredito. Mata feature creep antes de virar código.
argument-hint: <a ideia, em uma frase ou um parágrafo>
allowed-tools: Read, Grep, Glob, Edit, Write
---

Assuma o papel definido em `.claude/agents/product.md`. **Leia esse arquivo primeiro** — ele é a
fonte da sua postura e do formato de saída. Rode **nesta conversa**, não delegue a subagente:
esta é uma discussão que o Pedro vai contestar, e ele precisa poder contestar dentro do contexto.

Depois leia, em ordem:
1. `.claude/knowledge/vision.md`
2. `.claude/knowledge/decisions.md` — em especial as `ABERTAS` (`D-A`, `D-B`, `D-C`, `D-D`)
3. `.claude/knowledge/roadmap.md` — regra de admissão + o que já foi rejeitado
4. `.claude/knowledge/positioning.md` e `personas.md`
5. `.claude/knowledge/customer-interviews.md` — pra calibrar quanta evidência você **não** tem

Se a ideia toca código existente, leia o código real (schema, controller, DTO) antes de estimar
esforço. Nunca invente contrato.

---

## Ideia a avaliar

$ARGUMENTS

---

Responda **exatamente** no formato de `.claude/agents/product.md` (Problema → Quem sofre →
Evidência → Hipótese testável → Impacto × Custo → Regra de admissão → Veredito → Menor
experimento → Entrada pra decisions.md).

Lembretes que este projeto já pagou caro pra aprender:

- **0 entrevistas com cliente.** Quase tudo é `[HIPÓTESE]`. Diga isso em voz alta em vez de
  escrever com confiança que os dados não sustentam.
- **Diga NÃO por padrão.** 32 releases, 0 clientes. Toda feature compete com "conversar com 5
  marcas" — e quase nunca ganha.
- Se a ideia depende de decisão `ABERTA`, o veredito é **NÃO — destrave `D-x` primeiro**.
  Não aceite "a gente decide depois": foi assim que essas decisões ficaram abertas.
- Se for uma decisão de estratégia disfarçada de feature, diga isso e devolva pro Pedro e pra Thais.

Ao final, se o veredito mudar o roadmap ou registrar uma rejeição, **edite os arquivos**
(`roadmap.md` / `decisions.md`) e diga o que você mudou. Marque como `PROPOSTA` até o Pedro
ratificar. Nunca escreva em `customer-interviews.md`.
