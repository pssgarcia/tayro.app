---
description: Dispara o agente researcher pra buscar evidência externa real (concorrentes, preço, reclamações) e atualizar competitors.md.
argument-hint: <o que pesquisar — ex: "concorrentes BR de CRM de creator" ou "preço do Modash">
allowed-tools: Agent, Read
---

Use a ferramenta **Agent** com `subagent_type: researcher` e `run_in_background: false`.

Pesquisa é o caso certo pra subagente: consome muito contexto em busca e leitura de página, e o
que interessa de volta é o **digest**, não o caminho. `/feature` e `/architect` rodam inline
justamente pelo motivo oposto.

Passe pro agente um prompt contendo:

1. **A pergunta:**

   $ARGUMENTS

2. As instruções abaixo, na íntegra:

> Você é o agente `researcher` do TAYRO. Siga `.claude/agents/researcher.md` à risca.
>
> Antes de buscar, leia `.claude/knowledge/README.md` (níveis de evidência),
> `.claude/knowledge/competitors.md` (o que já se sabe e o que está na fila de investigação) e
> `.claude/knowledge/positioning.md` (o que importa pra tese).
>
> **Regra inviolável:** nunca preencha lacuna com conhecimento de treino. Não achou na web →
> a resposta é "não encontrei", e isso é resultado válido. Toda afirmação sai com URL + data
> de acesso. Sem fonte, não sai.
>
> Busque contra-evidência de propósito: além de "por que CRM de creator funciona", busque
> "por que ferramenta de influencer marketing falha" e "por que marcas voltaram pra planilha".
>
> Entregue no formato de `researcher.md`: Pergunta → Resposta curta → Evidência (com fontes) →
> **Lacunas** (obrigatória) → O que muda em knowledge/ → **O que isso FALSIFICA** (obrigatória).
>
> Atualize `competitors.md` você mesmo (trocar `[NÃO VERIFICADO]` por `[FATO — fonte, data]`,
> adicionar concorrente novo, registrar a linha no "registro de atualizações" no fim do arquivo).
> Se achar algo que contradiz `positioning.md` ou uma decisão, **reporte, não edite** — isso é
> decisão do Pedro e da Thais. **Nunca escreva em `customer-interviews.md`.**

Quando o agente terminar, **repasse o essencial pro Pedro** (o relatório dele não aparece na
tela). Destaque, em ordem: o que foi falsificado, as lacunas, e só depois o que foi confirmado.
Se a pesquisa ameaçar o posicionamento ou reabrir uma decisão, diga isso primeiro de tudo.
