# Decisões — TAYRO

> Append-only. Decisão não se apaga: se cair, cria-se uma nova entrada `SUPERA D-xx`.
> Objetivo: nunca mais rediscutir a mesma coisa do zero em três meses.
> Agente `product` propõe entrada; **Pedro ratifica**. Proposta não ratificada fica `PROPOSTA`.

**Formato:** `D-nn · data · decisão · motivo · status · gatilho de revisão`
**Status possíveis:** `FIRME` · `TEMPORÁRIA` · `PROPOSTA` · `ABERTA` · `SUPERADA`

---

## 🔴 Decisões ABERTAS (bloqueiam trabalho)

### D-A · Monetização: quem paga, quanto e como
**Status:** `ABERTA` — nunca foi discutida
**Por que bloqueia:** define se o TAYRO é negócio ou portfólio. Muda o produto: cobrar por
campanha ativa, por creator gerenciada ou por assinatura leva a designs diferentes. Também
define o que é limite de plano gratuito.
**O que já está decidido em volta:** a creator **nunca** paga (`vision.md` nº 1) — isso reduz
o espaço, não o fecha.
**Como resolver:** perguntas 11–13 do roteiro de marca. 5 entrevistas.
**Não construir feature de billing, plano ou limite antes disto.**

### D-B · Comprador primário: marca ou agência
**Status:** `ABERTA`
**Por que bloqueia:** agência exige modelo de dados novo (organização → clientes → campanhas),
permissões e outra proposta de valor. Hoje só existem `BRAND`/`INFLUENCER`/`ADMIN`.
**Assunção provisória:** **marca**, porque é o que o produto faz hoje.
**Como resolver:** 5 entrevistas de agência (roteiro P3). Critério: se ≥3 mostrarem disposição
a pagar maior que a de marca, reabrir o posicionamento **de propósito**.
**Nenhuma feature multi-cliente antes disto.**

### D-C · Go-to-market das 2 primeiras marcas
**Status:** `ABERTA`
**Por que bloqueia:** produto sem canal não vira negócio, e a rede da Thais é o único ativo de
distribuição conhecido. Não há plano.
**Como resolver:** decidir junto com D-A, depois das entrevistas.

### D-D · O que exatamente é "histórico verificado"
**Status:** `ABERTA` — é o diferencial nº 2 e não tem definição operacional
**Fato incômodo:** `PartnershipResult` existe no banco e **nenhum código escreve nele**
`[FATO — verificado 2026-08-06]`. Hoje "histórico" = contagem de candidaturas aprovadas.
**Precisa responder:** quem atesta a entrega? a marca confirma? o que acontece se ela não
confirmar? o que é público no perfil da creator?
**Ligado a `vision.md` nº 5** — nada de métrica que a gente não consiga provar.

### D-E · Exclusão de conta: apagar ou anonimizar
**Status:** `ABERTA` — levantada em 2026-08-14, nunca discutida
**Por que bloqueia:** é o direito do art. 18 VI (eliminação), e **os dois lados colidem**. Hoje o
schema tem `onDelete: Cascade` em tudo que pende de `User`, então apagar a conta de uma creator
levaria junto `Application` → `ContentSubmission` → `Reward` → `PartnershipResult`. Se ela já
recebeu pagamento, **a marca perde o próprio registro** da transação — e a marca também tem
obrigação de guardar isso.
**Precisa responder:** apagar de fato ou anonimizar (zerar nome/e-mail/handle/foto e manter a
linha do reward)? O que a marca continua vendo de uma creator que saiu? Existe prazo de retenção
antes da eliminação definitiva? Vale o mesmo para conta de marca?
**Consequência de desenho:** anonimizar não é "delete com outro nome" — muda o modelo (campos
nullable, flag de anonimização, o que os `select` da API passam a devolver) e é irreversível na
prática. Decidir ANTES de escrever o endpoint.
**Ligado a:** `vision.md` (o produto se posiciona em respeito à creator) e ao opt-in
`publicProfileEnabled`, que é a única superfície de LGPD que já existe hoje.

---

## Decisões de produto

### D-01 · ~2026-06 · CRM de creators, não marketplace transacional
**Motivo:** a dor central observada é **avaliar candidata**, não conectar oferta e demanda.
Marketplace exige liquidez dos dois lados desde o dia 1; CRM entrega valor com uma marca só.
**Status:** `FIRME` · **Revisar se:** entrevistas mostrarem que a marca não tem candidatura
espontânea suficiente — aí o problema é discovery e a tese cai.

### D-02 · ~2026-06 · Creator-first no discurso, marca-first na ordem de construção
**Motivo:** a marca paga e a marca sofre a dor aguda; a creator gera o dado que dá defesa.
Over-serve a marca primeiro, creator vem a reboque.
**Status:** `FIRME` · **Tensão conhecida:** o risco da P2 (creator não querer mais uma
plataforma) nunca foi testado. Se ela não vier, o diferencial de histórico morre.

### D-03 · ~2026-06 · Nicho de entrada: fitness/wellness
**Motivo:** rede e repertório da Thais reduzem custo de conseguir as primeiras conversas.
Não é exclusividade permanente.
**Status:** `FIRME` · **Revisar se:** as 5 primeiras entrevistas de fitness não fecharem.

### D-04 · ~2026-06 · A Lilo é a origem da dor, não a cliente
**Motivo:** construir produto, não software interno. Feature que só serve pra Lilo morre no `/feature`.
**Status:** `FIRME` (invariante de visão)

### D-05 · ~2026-06 · Oferta definida ANTES da candidatura
`offer*` em `Campaign` é fonte de verdade (`offerAmount` em centavos, `offerType` CASH|PRODUCT,
`offerDeadlineDays`, `offerDescription`). `rewardType`/`rewardValue` **deprecados**.
**Motivo:** mata negociação constrangedora e leilão de preço. É diferencial nº 4.
**Status:** `FIRME` (invariante de domínio, já no código)

### D-06 · ~2026-06 · Perfil público da creator nasce desligado
`publicProfileEnabled` default `false`.
**Motivo:** LGPD e confiança. O dado é dela.
**Status:** `FIRME` (invariante legal)

### D-07 · ~2026-06 · PIX manual no MVP, sem pagamento automático
**Motivo:** pagamento automático exige KYC, custódia e risco regulatório. Não valida nada da tese.
**Status:** `FIRME` pro MVP · **Revisar quando:** houver marca pagante pedindo, ou D-A apontar
receita ligada a transação.

### D-08 · ~2026-06 · Fora do MVP: ranking/gamificação, notificação in-app, relatório avançado, moedas/pontos, chat real-time
**Motivo:** nenhum valida o fluxo central. Feature creep clássico.
**Status:** `FIRME` · **Nota:** o modelo `Notification` existe no schema mas **não há módulo de
notificações na API** `[FATO — verificado 2026-08-06]`. Tabela órfã, coerente com esta decisão.

### D-09 · 2026-08-06 · NÃO criar calendário
**Motivo:** nenhum cliente demonstrou necessidade — e não há cliente pra demonstrar nada.
**Status:** `FIRME` · **Revisar após:** 10 entrevistas. Se aparecer em <3, continua fora.

---

## Decisões técnicas com consequência de produto

### D-10 · ~2026-06-20 · Produto INTEIRO é mobile-first — marca também
**Motivo:** público brasileiro é mobile-heavy dos dois lados. Assumir "marca = desktop" foi
erro explicitamente corrigido pelo Pedro.
**Status:** `FIRME`

### D-11 · ~2026-06-20 · PWA agora · Capacitor com tração · **nunca React Native**
**Motivo:** reuso de ~95% do código React. Loja adiciona fricção (review, US$99/ano Apple +
US$25 Google) e é prematuro antes de PMF.
**Status:** `FIRME` · **Revisar quando:** houver tração real ou push no iOS virar bloqueio.

### D-12 · 2026-07-05 · Railway plano Hobby pago (US$5/mês)
**Motivo:** o trial de créditos acabou silenciosamente e derrubou a API em produção.
**Status:** `FIRME` · **Nota operacional:** se a API cair do nada, checar billing **antes** do código.

### D-13 · ~2026-08 · `EMAIL_PROVIDER=stub` em produção
**Motivo:** sandbox do Resend só entrega pro e-mail da própria conta; domínio real só no fim do MVP.
**Status:** `TEMPORÁRIA` · **Revisar em:** compra do domínio, antes do lançamento.
**Consequência de produto que não pode ser esquecida:** hoje **nenhum e-mail chega pra usuário
real** — aprovação, recusa e link de claim inclusive. Qualquer feature que dependa de e-mail
está morta em produção até isso virar.

### D-14 · ~2026-08 · Sem reenvio manual de link de claim
Só reemite se a creator se candidatar de novo.
**Status:** `TEMPORÁRIA` (limitação aceita) · **Revisar quando:** primeira creator real travar.

### D-15 · 2026-08-05 · Auditoria de segurança e arquitetura via Fable antes do lançamento
**Motivo:** gate de lançamento definido pelo Pedro. Não é substituível por auto-revisão.
**Status:** `FIRME`

### D-18 · 2026-08-23 · Imagens do Instagram ficam no nosso banco, não em storage externo
**Status:** `PROPOSTA` — desenhado no `/architect`, aguarda implementação.
**Decisão:** guardar os **bytes** da foto de perfil e das thumbnails do feed numa tabela
dedicada (`IgImage`) no próprio Postgres, em vez de guardar só a URL assinada da CDN (que
expira) ou de subir as imagens para storage externo.
**Motivo:** as duas decisões abertas empurram para cá. Storage externo (Vercel Blob/S3) traria
fornecedor novo, credencial nova e custo recorrente com **`D-A` aberta** — e, pior, transformaria
exclusão de conta em rotina de limpeza manual com **`D-E` aberta**. A tabela no banco resolve
exclusão de graça por `onDelete: Cascade`.
**Alternativas descartadas:** (a) `Bytes` na própria `Influencer` — resolveria só a foto de
perfil e deixaria uma armadilha permanente de `select` numa linha lida em toda listagem;
(b) storage externo — ver acima; (c) remendo de re-sincronizar quando a CDN recusa — queima cota
da RapidAPI por visualização, esbarra no cooldown de 15min e não resolve as thumbnails, que o
navegador busca direto na CDN.
**Gatilho de revisão:** o campo `byteSize` existe pra isso. Quando `IgImage` passar a dominar o
tamanho do backup, migrar para storage externo — o endpoint que serve a imagem não muda, então a
migração é barata por construção.
**Ligado a:** decisão de NÃO migrar para a API oficial do Instagram, tomada no mesmo dia (ela
exigiria OAuth da creator e quebraria a candidatura espontânea sem conta — `D-17`; e não
resolveria expiração, porque também entrega URL temporária).

### D-17 · 2026-08-23 · Candidatura espontânea é o produto — e ele já está construído
**Status:** `PROPOSTA` — ratificação do Pedro em 2026-08-23, aguarda ratificação da Thais.
**Decisão:** o TAYRO ataca **avaliação e gestão de candidatura espontânea de micro-creator**,
e o que existe hoje em produção já É essa aposta — não falta capacidade, falta usuário.
Nenhuma feature nova é admitida com a justificativa de "resolver candidatura espontânea":
a resposta correta a esse pedido é ligar o e-mail e rodar o funil com uma marca real.
**Motivo:** avaliado no `/feature` de 2026-08-23. A dor descrita ("candidatura espontânea,
conectar de forma simples") é o `positioning.md` reescrito — `/apply/:id`, `/programs`, aba
Fila e oferta-antes já entregam os quatro pedaços. Não se conseguiu descrever a dor sem
descrever o produto, que é o teste de "solução procurando justificativa".
**Contexto que gerou:** pesquisa do Conty (2026-08-23) mostrou que o concorrente citado é
marketplace de missão gamificada com discovery — **não** disputa este espaço. A pergunta nº 1
do `competitors.md` ("ninguém ataca avaliação de candidatura espontânea de micro-creator")
segue aberta, e isso é evidência fraca a favor da aposta, não confirmação dela.
**O que fica de fato bloqueando:** `D-13` (e-mail em stub — o ciclo está cortado em produção:
a creator se candidata, cria conta e nunca recebe o link de acesso; a marca aprova e ela nunca
fica sabendo) e `D-C` (não existe plano de como a 1ª marca chega).
**Leitura descartada nesta rodada:** "candidatura a uma MARCA sem programa aberto" (creator se
candidata sem existir campanha). Pedro confirmou que não era isso. Se voltar, é capacidade nova
e exige `/feature` próprio — risco conhecido: vira caixa de entrada de spam pra marca.
**Gatilho de revisão:** primeiras 5 entrevistas. Se marca nenhuma citar candidatura espontânea
como dor real, esta decisão cai e o posicionamento inteiro é reaberto.

### D-16 · ~2026-08 · Instagram: fila assíncrona (BullMQ+Redis) é o alvo, ainda não implementado
**Motivo:** buscar dado do IG é lento, instável e rate-limited; síncrono quebra UX.
Também é veículo declarado de aprendizado (filas, observabilidade).
**Status:** `PROPOSTA` — desenhado, não construído. Hoje é `setImmediate` fire-and-forget.
**Ligado ao bug conhecido:** IG não vem completo na 1ª candidatura.

---

## Convenções que não se rediscute

- Dinheiro sempre em **centavos** (`Int`). Nunca float.
- `Campaign.status` é máquina de estados `DRAFT→ACTIVE→CLOSED→COMPLETED`. Publicar é transição
  guardada, não flag.
- `maxSpots` = vagas para creators **aprovadas** ≠ total de candidaturas.
- Release `develop → main` sempre **merge commit**, nunca squash.
- `CLAUDE.md` fica versionado no repo (já se perdeu 2x quando era gitignored).

---

## Registro de propostas rejeitadas

### 2026-08-23 · "Resolver candidatura espontânea / conectar de forma simples" como feature
**Veredito:** `NÃO — não é feature, é ratificação de estratégia.` Ver `D-17`.
**Motivo em uma frase:** a dor não pôde ser descrita sem descrever o produto que já existe —
falhou nos critérios 4 (não cabe em release, não tem escopo) e 5 (não dá pra dizer o que se
aprende) da regra de admissão.
**O que substituiu:** ligar o e-mail (`D-13`) e rodar o funil de uma marca real por 2 semanas,
medindo candidaturas recebidas, taxa de claim concluído e tempo de decisão da marca.
**Não ressuscitar** sem uma dessas duas coisas: entrevista de marca dizendo que a avaliação
continua manual **apesar** do TAYRO, ou dado do funil real mostrando onde ele quebra.
