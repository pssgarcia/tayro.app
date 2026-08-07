# knowledge/ — o cérebro do TAYRO

Estes arquivos são lidos por **todos** os agentes antes de qualquer decisão de produto.
Logo: **lixo aqui vira doutrina lá.** Um número inventado neste diretório vira "dado de mercado"
na boca de três agentes diferentes em duas semanas.

## Regra 1 — Toda afirmação carrega seu nível de evidência

Nenhuma frase sobre mercado, cliente ou concorrente entra aqui sem tag:

| Tag | Significa | Quem pode escrever |
|---|---|---|
| `[FATO]` | Verificável agora: está no código, no git, num print, numa conversa real e datada | qualquer um, com a fonte junto |
| `[HIPÓTESE]` | A gente acredita. Não tem evidência. | qualquer um |
| `[FALSIFICADO]` | A gente acreditava, a evidência matou. **Não apagar** — o erro é a informação | quem trouxe a evidência |

Sem tag = `[HIPÓTESE]` por padrão. Agente que apresentar hipótese como fato está errado, e isso
é motivo de rejeitar o output dele.

## Regra 2 — Nenhum agente inventa cliente

`customer-interviews.md` é a **única** fonte de "o cliente disse". Hoje ela está em `n=0`.
Enquanto estiver, qualquer frase do tipo "usuários reclamam que…" só pode existir como
`[HIPÓTESE]`. Modelo de linguagem não é substituto de entrevista, e conhecimento de treino
sobre o mercado brasileiro de creators é raso e desatualizado.

## Regra 3 — `decisions.md` é append-only

Decisão registrada não se apaga, se **supera** com uma nova entrada que referencia a anterior.
O valor do arquivo é justamente conseguir responder "por que a gente descartou isso em agosto?"
sem refazer a discussão.

## Regra 4 — Estes arquivos são produto, não código

`CLAUDE.md` (raiz do repo) = **como construir**: stack, convenções, footguns, o que já está pronto.
`.claude/knowledge/` = **o que construir e por quê**: visão, cliente, concorrência, prioridade.

Não duplicar. Se um agente precisa saber que dinheiro é em centavos, isso é `CLAUDE.md`.
Se precisa saber por que a oferta aparece antes da candidatura, isso é `decisions.md`.

## Regra 5 — Quem atualiza

| Arquivo | Dono | Quando muda |
|---|---|---|
| `vision.md` | Pedro + Thais | quase nunca. Se muda todo mês, não era visão |
| `positioning.md` | Pedro + Thais | a cada bloco de entrevistas |
| `personas.md` | agente `researcher` propõe, Pedro aprova | a cada entrevista |
| `competitors.md` | agente `researcher` | sempre que descobrir algo — é tabela viva |
| `customer-interviews.md` | Pedro/Thais **na mão**, agente nunca escreve | a cada entrevista |
| `decisions.md` | agente `product` propõe, Pedro ratifica | a cada decisão |
| `roadmap.md` | agente `product` | a cada release |

## Estado da base (2026-08-06)

- Entrevistas com cliente: **0**
- Marcas pagantes: **0**
- Concorrentes verificados: **0** (a tabela é conhecimento de modelo, não pesquisa)
- Decisão de monetização: **não tomada**

Isso não é vergonha, é o ponto de partida honesto. O que seria vergonha é escrever
os arquivos como se não fosse verdade.
