# Decisões — TAYRO

> Append-only. Decisão não se apaga: se cair, cria-se uma nova entrada `SUPERA D-xx`.
> Objetivo: nunca mais rediscutir a mesma coisa do zero em três meses.
> Agente `product` propõe entrada; **Pedro ratifica**. Proposta não ratificada fica `PROPOSTA`.

**Formato:** `D-nn · data · decisão · motivo · status · gatilho de revisão`
**Status possíveis:** `FIRME` · `TEMPORÁRIA` · `PROPOSTA` · `ABERTA` · `SUPERADA`

**Regra sobre `FIRME` (incidente 2026-08-07):** só fica `FIRME` **sem** "revisar se" uma decisão
de **valor ou obrigação legal** (ex.: `D-06` LGPD, os "nunca" de `vision.md`) — aí não é hipótese
de mercado, não existe entrevista que a derrube. Toda decisão que é **aposta sobre o que
cliente quer** (formato de oferta, nicho, canal, precificação) precisa de gatilho, mesmo
`FIRME`, porque "já está implementado" é fato sobre o código, não evidência de mercado. Errar
essa distinção foi exatamente o que aconteceu em `D-05` até o Pedro corrigir.

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
**Padrão a sondar (2026-08-07):** afiliação por cupom + comissão % recorrente — visto de perto
no programa de creators do RamboTeam (consultoria esportiva). Diferente do mecanismo atual do
TAYRO (`D-05`, oferta única fixa). Não adotar por causa de uma conversa só (viés: Pedro é
afiliado pagante do programa) — mas é candidato real de modelo a perguntar nas entrevistas P1,
não descartar de antemão.

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

### D-05 · ~2026-06 · Oferta transparente definida ANTES da candidatura (princípio) · mecanismo em aberto
**Princípio — este sim `FIRME`, é `vision.md` "nunca" nº 2:** a creator sabe valor e condições
ANTES de se candidatar. Sem negociação constrangedora, sem leilão de preço, sem descobrir o
valor depois de topar.
**Mecanismo atual — isto é o que pode mudar:** `offer*` em `Campaign` (`offerAmount` em
centavos, `offerType` CASH|PRODUCT, `offerDeadlineDays`, `offerDescription`) — pagamento
**único, não recorrente, não percentual**. `rewardType`/`rewardValue` deprecados.
**Motivo original:** mata negociação constrangedora. É diferencial nº 4.
**Status:** princípio `FIRME` · mecanismo `TEMPORÁRIA`.
**Revisar mecanismo se:** entrevista mostrar demanda por modelo recorrente/comissionado (ex.:
afiliação por % contínuo, padrão RamboTeam) que ainda respeite o princípio — taxa fixa e
transparente, não negociada candidatura a candidatura. Ligado a `D-A` (monetização, `ABERTA`).

**Correção de 2026-08-07 (Pedro pegou o erro):** esta entrada estava `FIRME` sem gatilho de
revisão, a única no arquivo nessa condição sem ser valor/legal. "Já estar implementado" tinha
virado sinônimo de "validado" — exatamente o vício que este arquivo existe pra impedir. Nada
que está pronto está testado só por estar pronto. Regra geral movida pro cabeçalho do arquivo.

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

*(vazio — usar quando o `/feature` matar uma ideia. Ideia morta com motivo registrado
vale tanto quanto feature entregue: evita ressuscitar a mesma coisa em novembro.)*
