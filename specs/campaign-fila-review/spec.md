---
slug: campaign-fila-review
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/web/src/pages/brand/CampaignFilaTab.tsx
  - apps/web/src/pages/brand/CampaignPipelineMobileStory.tsx
related_decisions: []
---

# Campaign fila review ("Kinetic Editorial")

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. É a interface pela qual a marca revisa candidaturas de uma campanha. Não
redefine domínio: a máquina de estados que esta tela opera é a de `Application`, descrita em
`applications-pipeline`.

## Scope
Duas superfícies de revisão (desktop e mobile/tablet) sobre a mesma fonte de dados, incluindo o
comportamento de polling enquanto dados de Instagram ainda não chegaram.

## Out of Scope
- Máquina de estados, guardas e endpoints de `Application` — ver `applications-pipeline`. Esta
  interface só consome (aprova/rejeita/pede refresh via os endpoints já descritos lá).
- Busca de dados de Instagram em si (retry, staleness) — ver `instagram-sync`.
- Cálculo real de afinidade entre creator e campanha. O que a tela chama de "Match Score" **não
  é um cálculo real** — é um placeholder visual (hash determinístico do `application.id`,
  mapeado pra 70–95%), decisão explícita registrada em comentário no próprio código pra não
  fingir um cálculo real ainda. Não interpretar o número exibido como sinal de afinidade.

## Domain
Sem entidade própria. A tela lê `Application` (via `GET /applications/campaign/:id`) e reflete
o `influencer.igFetchStatus` de cada uma pra decidir se ainda precisa pollar.

## Behavior

### Duas superfícies, mesmo dado
- **Desktop/telas largas (`lg:` e acima):** lista "Pipeline" com **toda** candidatura da
  campanha, qualquer status (não só `PENDING`) — diferente do carrossel que esta tela substituiu,
  que só mostrava quem esperava decisão. Uma placa de detalhe mostra a candidatura selecionada.
- **Mobile/tablet (abaixo de `lg:`):** revisão em formato Story do Instagram — um candidato
  `PENDING` por vez, em tela cheia, cobrindo a navegação inferior do layout de marca. Navegação
  por toque nas laterais ou swipe horizontal. Aprovar ou rejeitar avança automaticamente pro
  próximo candidato pendente. Barra de progresso em segmentos; tela de fim de fila mostra a
  contagem de aprovados/rejeitados da sessão.
- Swipe pra cima (ou "Ver posts") abre um painel com a mensagem da candidatura e o feed de
  Instagram, sem perder a posição na fila.
- "Fechar revisão" no modo mobile não navega pra outra rota — só sai do modo imersivo de volta
  pro corpo normal da aba (a Fila já é a rota atual).
- A escolha entre as duas superfícies é só o breakpoint — não há um terceiro layout
  intermediário pra tablet.
- Query e mutations (buscar candidaturas, aprovar, rejeitar, pedir refresh de IG) são
  compartilhadas entre as duas superfícies — não há busca duplicada.

### Poll-while-PENDING
Enquanto existir alguma candidatura `PENDING` cujo `influencer.igFetchStatus` ainda seja
`PENDING` (dado de Instagram do apply ainda não chegou — ver `instagram-sync`), a lista de
candidaturas é buscada de novo a cada **6 segundos**. Se essa condição persistir por **45
segundos contínuos**, o polling para (evita rodar indefinidamente se a busca externa nunca
resolver). Se em algum momento não houver mais ninguém nessa condição, o cronômetro de 45s é
zerado — uma nova candidatura pendente futura volta a pollar normalmente.

## UI Behavior
Ver "Behavior" acima — nesta capacidade, interface **é** o comportamento (não há regra de
negócio separada da apresentação).

## Acceptance Criteria
- [x] Desktop mostra toda candidatura da campanha, qualquer status.
- [x] Mobile mostra só candidaturas `PENDING`, uma por vez.
- [x] Aprovar ou rejeitar no modo mobile avança automaticamente pro próximo pendente.
- [x] O polling de 6s roda somente enquanto houver candidatura `PENDING` com IG também
      `PENDING`; para depois de 45s contínuos nessa condição.
- [x] O cronômetro de 45s reinicia se, a qualquer momento, deixar de haver alguém pendente.
- [x] "Fechar revisão" no mobile não dispara navegação de rota.

## Known Gaps
- **Nenhum teste automatizado cobre esta capacidade.** Nem `CampaignFilaTab` nem
  `CampaignPipelineMobileStory` têm spec — a lógica de polling (timeout, reset), navegação por
  swipe e contagem de tally não têm proteção contra regressão; a validação registrada em
  `CLAUDE.md` foi manual, rodando o app de verdade. Risco real: a lógica de timeout de polling
  é a parte mais fácil de quebrar silenciosamente numa mudança futura, exatamente por não ter
  teste.

## Test Coverage
- [ ] `CampaignFilaTab.spec.tsx` — não existe.
- [ ] `CampaignPipelineMobileStory.spec.tsx` — não existe.

## Current Implementation
- Constantes `POLL_INTERVAL_MS = 6_000` / `POLL_TIMEOUT_MS = 45_000`, definidas em
  `CampaignFilaTab.tsx`. O timeout de 45s é controlado por um `useEffect` com `pollStartRef`
  contando o tempo contínuo em condição de pendência.
- `matchScore` (placeholder, ver "Out of Scope"): `hash = hash*31 + charCode` sobre
  `application.id`, depois `70 + hash % 26`.
- "Bio Note" na UI mostra `application.message` (dado real da creator) — apesar do nome sugerir
  algo mais elaborado, não é um campo separado nem calculado.
- Breakpoints Tailwind: desktop `hidden lg:grid`, mobile `lg:hidden`.
- Estado (query + mutations `useApproveApplication`/`useRejectApplication`/
  `useRefreshApplicationIg`) vive em `CampaignFilaTab` e é passado como props pro componente
  mobile.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD. Mudança conceitual: seção "API / Interfaces" foi
  omitida de propósito (capacidade sem endpoint próprio — os endpoints consumidos já estão
  documentados em `applications-pipeline`, listá-los de novo aqui seria duplicação).
