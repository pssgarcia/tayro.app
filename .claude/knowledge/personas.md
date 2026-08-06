# Personas — TAYRO

> Atualizado: 2026-08-06
> **Nível de evidência de TODAS as personas abaixo: `[HIPÓTESE]`. Entrevistas realizadas: 0.**
> São retratos-falados construídos a partir da experiência da Thais e de suposições nossas.
> Persona não validada é ficção útil — útil pra alinhar decisão, ficção pra citar como prova.

---

## P1 — Marina, sócia-operadora de marca `[PERSONA PRIMÁRIA]`

**Quem é.** 32 anos, sócia de uma marca de moda fitness que fatura o suficiente pra ter estoque
próprio e não o suficiente pra ter time de marketing. Ela *é* o time de marketing.

**Como trabalha hoje.**
- Recebe candidatura por DM do Instagram e por um formulário do Google
- Abre o perfil de cada candidata na mão pra ver seguidores, se o conteúdo combina, se é real
- Planilha com nome, @, o que foi enviado, código de cupom, se postou
- Cobra o post no WhatsApp
- Faz PIX ou manda produto pelos Correios

**Dor, em ordem de intensidade:**
1. Avaliar candidata consome a tarde inteira e a decisão sai insegura mesmo assim
2. Perde o fio: quem já recebeu produto, quem postou, quem sumiu
3. Não sabe o que funcionou — no fim do mês não consegue dizer qual creator valeu

**O que ela quer.** Decidir rápido e com menos culpa. Não quer "plataforma de gestão", quer
parar de abrir 40 perfis do Instagram.

**Gatilho de compra `[HIPÓTESE]`.** O volume de candidaturas passa do que ela consegue avaliar
numa tarde.

**Por que ela não compraria.** Já tem planilha que "funciona"; trocar dá trabalho. Ferramenta
nova só entra se resolver a avaliação **na primeira tela** — se ela precisar cadastrar histórico
antes de ver valor, desiste.

**Origem.** Retrato da Thais na Lilo. `[FATO n=1, mas é sócia — enviesada e não é evidência de
mercado. Ela conhece a dor, não o mercado.]`

---

## P2 — Bia, micro-creator fitness `[USUÁRIA ESSENCIAL, NÃO PAGANTE]`

**Quem é.** 24 anos, 8 a 30 mil seguidores, treina e posta. Marketing de influência é renda
complementar, não profissão principal — ainda.

**Como trabalha hoje.** Manda DM ou preenche formulário pra marcas que abrem chamada. Monta
print de métricas quando pedem media kit. Aceita permuta sem saber o valor. Espera resposta que
às vezes não vem.

**Dor:**
1. Não sabe quanto vai receber nem quando, e tem vergonha de perguntar
2. Silêncio: candidata e nunca mais fica sabendo de nada
3. Recomeça do zero em cada marca — nada do que ela entregou antes conta a favor dela

**O que ela quer.** Saber o valor antes de topar, e ter algo que prove que ela entrega.

**Por que ela usaria mesmo sem pagar.** Porque as marcas estão lá. O lado dela só tem valor se
o lado da marca tiver — clássico problema de ovo e galinha, e o ovo aqui é a marca.

**Risco.** `[HIPÓTESE não testada]` — a Bia pode simplesmente não querer mais uma plataforma.
O Instagram já é a plataforma dela. Se o TAYRO for mais uma coisa pra manter, ela abandona.
Isso é a coisa mais perigosa desta lista e ninguém verificou.

---

## P3 — Owner de agência `[PERSONA EM DISPUTA — NÃO CABE NO PRODUTO ATUAL]`

Persona descrita pelo Pedro na montagem desta base:

> Dona de agência · 15 creators na carteira · usa WhatsApp, Excel e Drive ·
> perde prazo · esquece pagamento · não sabe ROI · quer menos trabalho operacional

**Por que está marcada em disputa.** O produto não tem o conceito de agência. Os papéis são
`BRAND`, `INFLUENCER` e `ADMIN`. `[FATO — schema.prisma:12]` Uma agência gerencia campanhas de
**vários clientes**, o que exige organização, carteira e permissão — nada disso existe.

**A dor descrita é real e provavelmente mais aguda que a da Marina** (quem opera pra terceiro
tem prestação de contas, prazo contratual e reputação em jogo). Mas atender essa pessoa é uma
mudança de produto, não uma feature.

**O que fazer com ela:** entrevistar **antes** de construir qualquer coisa. Se 3 de 5 entrevistas
de agência mostrarem disposição a pagar mais que marca, o posicionamento muda e a gente decide
isso de propósito. Ver `decisions.md` `D-B`.

**Não usar essa persona pra justificar feature enquanto `D-B` estiver aberta.**

---

## Anti-personas (dizer não sem culpa)

- **Head de marketing de enterprise** — quer contrato, SSO e integração. Não é nosso jogo.
- **Marca caçando mega-influencer** — quer discovery e CPM. Não é nosso jogo.
- **Creator profissional com empresário** — já tem quem negocie por ela; nosso valor cai a zero.
- **Marca de serviço sem produto físico** — sem permuta e sem cupom, metade do modelo não se aplica.

---

## Como validar isto (o trabalho que falta)

Cada persona precisa de **5 entrevistas** pra sair de `[HIPÓTESE]`. Prioridade:

1. **P1 (marca)** — é quem paga. Sem isso não há negócio. Meta: 5 até o lançamento
2. **P3 (agência)** — decide o posicionamento. Meta: 5, e antes de qualquer feature multi-cliente
3. **P2 (creator)** — testar o risco de abandono acima. Meta: 5

Roteiros e registro: `customer-interviews.md`. Nenhum agente escreve lá.
