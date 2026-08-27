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

### D-19 · 2026-08-26 · Verificar existência do handle do Instagram: no formulário, fail-open, cache em memória
**Status:** `FIRME` — implementado na branch `feature/validar-handle-instagram-no-apply`
(2026-08-27), aguardando commit/PR/merge pra `develop`. Pedro ratificou o desenho ("Pode") antes
da implementação; o risco aberto abaixo foi fechado por `curl` real antes do merge.
**Decisão:** a candidatura pública e o cadastro de creator ganham uma verificação síncrona de
que o @ digitado existe de verdade (`GET /ig/handle/:handle`, três desfechos: `FOUND` /
`NOT_FOUND` / `UNKNOWN`), disparada no blur do campo e de novo no submit se ainda não houver
desfecho — nunca durante a digitação. Só `NOT_FOUND` bloqueia; `UNKNOWN` (provedor fora do ar,
timeout, teto de cota) deixa passar. `ApplyModal` (candidatura autenticada) fica de fora — não
existe campo de handle nesse fluxo, o @ vem da conta.
**Motivo:** supera o `NÃO` inicial do `/feature` (mesma data, ver acima) — aquele veredito
avaliou "bloquear a candidatura por causa de um efeito colateral acessório", o que de fato fere
a Regra 10 de `creator-discovery-and-apply`. O pedido real, esclarecido pelo Pedro, é validar o
**dado de entrada** antes do envio, reaproveitando uma chamada que o sync faria de qualquer
forma — não é o mesmo risco, e a Regra 10 continua protegendo os efeitos colaterais de verdade
(e-mail, claim, sync de feed).
**Por que fail-open em `UNKNOWN`:** acusar o @ de uma creator legítima de inexistente porque a
RapidAPI piscou custa mais caro (perde a candidatura) do que deixar passar um typo ocasional
(vira `FAILED` na Fila como hoje, com retry manual). A alternativa (bloquear na dúvida)
transformaria indisponibilidade de terceiro em candidatura perdida.
**Por que cache em memória (TTL 15min), não tabela nova:** evita pagar a RapidAPI duas vezes
pelo mesmo handle (verificação + sync pós-criação) sem introduzir um conceito de domínio
permanente pra um dado que vale 15 minutos. Degrada (não quebra) se houver mais de uma instância
ou restart entre verificar e enviar — nesse caso paga-se o profile de novo, não há erro visível.
Muda de casa pra Redis de graça quando `D-16` sair do papel.
**Por que a garantia é do formulário, não da API:** `POST /programs/:id/apply/public` continua
aceitando qualquer handle de formato válido — quem chamar por fora do formulário (curl, etc.)
passa. Pôr a verificação no servidor, bloqueando o próprio endpoint de candidatura, reintroduziria
latência síncrona (até 5s) no evento de conversão mais importante do funil — exatamente o que o
`/feature` recusou. A verificação é ajuda a quem está digitando, não proteção contra abuso.
**Teto de cota:** throttle 10/60s por IP na rota de verificação (mais apertado que o padrão
global) + teto global de consultas ao provedor por minuto (`IG_HANDLE_CHECK_BUDGET_PER_MINUTE`,
default 60) — ao estourar, devolve `UNKNOWN` sem chamar o provedor. Necessário porque throttle
por IP sozinho não segura rotação de IP numa rota pública que gasta dinheiro por chamada.
**Risco fechado (2026-08-27):** confirmado por `curl` real contra a RapidAPI com a chave do `.env`
local. Handle inexistente de formato válido (`naoexistetayro99zzz`, 19 chars) → `404` com corpo
`{"status":"error","error":"We're sorry, we couldn't find that."}` — bate exatamente com o
mapeamento implementado (`404` → `NOT_FOUND`). **Achado no caminho:** a 1ª tentativa usou um
handle de 38 caracteres (acima do limite de 30 do Instagram) e também voltou `400` — não `404` —
o que teria sido um falso sinal se aceito sem reteste; formato inválido e "não existe" não são a
mesma resposta na API real. Falta ainda repetir a checagem uma vez em produção (`IG_HANDLE_CHECK_BUDGET_PER_MINUTE`
e o resto do fluxo rodando com tráfego real), não porque haja dúvida sobre o mapeamento, mas
porque nenhuma chamada real em prod tinha acontecido até este ponto.
**Alternativas descartadas:** (a) verificar durante a digitação (debounce) — prefixo de handle
costuma ser handle real de outra pessoa, dá falso-positivo e queima cota a cada pausa; (b) tabela
`IgHandleCheck` dedicada — conceito novo permanente pra cache de 15min, não compensa; (c)
bloquear no próprio endpoint de candidatura — ver "garantia do formulário" acima.
**Ligado a:** `Regra 10` de `creator-discovery-and-apply`, `D-16` (fila assíncrona — destino do
cache quando existir Redis), `D-18` (mesmo padrão de "não pagar a API duas vezes").

### D-20 · 2026-08-27 · Adotar Sentry para observabilidade (API + Web)
**Status:** `PROPOSTA` — implementado nas branches `feature/observabilidade-sentry-api` e
`feature/observabilidade-sentry-web` (2026-08-27), **aguardando ratificação do Pedro** antes do
merge. O código fica inerte sem DSN, então nada muda em produção até as env vars serem setadas.
**Decisão:** `@sentry/nestjs` na API e `@sentry/react` na web. Escopo: captura de erro não
tratado + tracing de performance amostrado a 10% (`tracesSampleRate` 0.1). **Session Replay
fica de fora.** Projeto na região **EU** (DSN `ingest.de.sentry.io`). `SENTRY_DSN` é
obrigatório em produção na API — sem ele o boot falha (`resolveSentryConfig` lança, mesma regra
do `resolveAllowedOrigins`).
**Motivo:** hoje um erro em produção só se descobre por reclamação (e não há de quem reclamar
ainda). O pior caso concreto é o `instagram-sync` fire-and-forget: `setImmediate` que falha
**depois** da resposta HTTP — nem o Nest nem ninguém vê, só existe como uma linha de
`logger.error` que "nunca foi lida por ninguém". A API também não tinha exception filter global
nem o front tinha error boundary — os dois furos que este trabalho fecha de qualquer forma.
Puxado do checklist de pré-lançamento pra agora de propósito: custo zero, 0 usuários reais
(janela ideal pra configurar scrubbing antes de haver dado sensível), e é aprendizado explícito
de observabilidade (mesma justificativa de `D-16`).
**Objeção "fornecedor novo, credencial nova, custo recorrente" (precedente `D-18`, orçamento
`D-12`):** custo — free tier (Developer), ~5k erros/mês, 1 usuário, sem cartão; com scrubbing e
0 usuários, folgado, e estourar 5k erros/mês é sinal de problema real, não de custo. Credencial
— 1 DSN (público por design no client) + 1 auth token de build no env do projeto Vercel;
**nada novo no GitHub Secrets**. Lock-in — Sentry é self-hostável; a saída é trocar o DSN.
**LGPD (`vision.md` nº 3 — "nunca expor dado de creator sem consentimento"):** Sentry passa a
ser o **2º processador externo de dado pessoal** (junto com a RapidAPI). Mitigações no código:
`sendDefaultPii: false` (sem IP), `beforeSend` remove corpo de `/auth/*` e headers de auth,
Session Replay desligado, região EU. Entra como sub-processador na futura política de
privacidade (item LGPD aberto no `roadmap.md`) e no texto de consentimento dos 3 fluxos de
entrada, junto com a divulgação da RapidAPI.
**Alternativas descartadas:** (a) só logging estruturado + métricas próprias (Prometheus/
Grafana) — mais infra pra manter, sem o agrupamento por fingerprint e o contexto de request
que é o valor real agora; (b) self-hosted Sentry — precisa de ~4GB RAM e docker-compose, caro
demais pro estágio; (c) esperar o lançamento — o roadmap dizia isso, mas rodar cego em prod
com os primeiros usuários é o risco maior, e a janela sem dado sensível é agora.
**Não fez parte:** upload de sourcemap da API (o `node --enable-source-maps` + os `.js.map` do
tsc já dão stack legível), tunnel anti-ad-blocker (0 usuários), boundary por layout no front
(um no topo agora; por layout é follow-up não-bloqueante).
**Flags para ratificação do Pedro:** (a) região EU vs US — escolhida EU; (b) `SENTRY_DSN`
obrigatório no boot em produção — escolhido sim; (c) adotar antes da política de privacidade —
escolhido sim, com scrubbing e Replay off.
**Ligado a:** `D-16` (fila assíncrona — o mesmo `instagram-sync` que este trabalho instrumenta),
`D-18` (mesma disciplina de "não adicionar infra permanente de leve"), item LGPD do `roadmap.md`.

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

### 2026-08-26 · `PROPOSTA` — Validar handle do Instagram em tempo real antes de aceitar candidatura
**Veredito:** `NÃO — contradiz Regra 10 de creator-discovery-and-apply, resolve problema com zero evidência.`
**Motivo em uma frase:** bloquear o submit até confirmar o handle contra a API do Instagram
reabre o risco que a `Regra 10` da spec (nenhum efeito acessório derruba a candidatura — o
evento de conversão) foi escrita e testada pra fechar, no ponto mais frágil do funil (o mesmo
`/apply/:id` que quebrou 2x em produção nos últimos 2 dias antes desta data), pra corrigir um
problema que nenhuma marca real relatou — `EMAIL_PROVIDER` ainda em stub, zero candidatura real
processada.
**O que substituiu:** rodar o item #0 do roadmap (ligar e-mail, funil real com uma marca) antes.
Se handle inválido aparecer de fato na fila e incomodar a marca, a correção barata e que não
fere `Regra 10` é diferenciar "handle não encontrado" de "falha temporária" dentro do estado
`FAILED` já existente — sem tocar no caminho síncrono do submit.
**Não ressuscitar** sem: (a) o item #0 do roadmap rodando com marca real, e (b) evidência de que
handle inválido realmente chega na fila e é confundido com falha temporária pela marca.

**Correção do Pedro, mesma data:** o pedido real é mais estreito do que o avaliado acima e o
veredito muda. Não é "bloquear a candidatura até confirmar contra a API" como efeito acessório —
é validar o **dado de entrada** (o handle existe?) no próprio formulário, antes do submit,
reaproveitando a mesma chamada que o sync já faria de qualquer forma. Isso não fere `Regra 10`
(que protege a candidatura de efeito colateral acessório — claim, e-mail, sync pós-criação —
não de validação do próprio campo que a pessoa está preenchendo). Pedro ratificou seguir com
essa versão escopada em 2026-08-26. **Vai para `/architect`** — decidir: throttle/custo de cota
na validação síncrona (rota pública sem auth), e evitar pagar a RapidAPI duas vezes (validação
no submit + `scheduleRefresh` que dispara ao criar a candidatura).
