---
slug: campaign-fila-review
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-31
implements:
  - apps/web/src/pages/brand/CampaignFilaTab.tsx
  - apps/web/src/pages/brand/CampaignPipelineMobileStory.tsx
related_decisions:
  - "decisions.md 2026-08-27 (propostas rejeitadas) — cadastro manual de creator = NÃO; paridade mobile da Fila = implementar"
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
- **Todo texto visível é em português.** Vale para rótulo estrutural também (a lista de
  candidaturas, seguidores, engajamento, a mensagem da candidatura, os posts recentes) e para o
  status de cada candidatura na lista. Até 2026-08-23 esses rótulos eram em inglês por decisão
  de design registrada; a decisão foi revertida.
- **Desktop/telas largas (`lg:` e acima):** lista de candidaturas com **toda** candidatura da
  campanha, qualquer status (não só `PENDING`) — diferente do carrossel que esta tela substituiu,
  que só mostrava quem esperava decisão. Uma placa de detalhe mostra a candidatura selecionada.
- **Mobile/tablet (abaixo de `lg:`):** tem **dois modos**, alternados por um controle no
  cabeçalho, espelhando o que o desktop mostra lado a lado:
  - **"Revisar"** (padrão): revisão em formato Story do Instagram — um candidato `PENDING` por
    vez, em tela cheia, cobrindo a navegação inferior do layout de marca. Navegação por toque nas
    laterais ou swipe horizontal. Aprovar ou rejeitar avança automaticamente pro próximo
    candidato pendente. Barra de progresso em segmentos; tela de fim de fila mostra a contagem de
    aprovados/rejeitados da sessão.
  - **"Todas"**: lista de **toda** candidatura da campanha, qualquer status, com o rótulo de
    status em português (fonte única `applicationStatusWord` em `utils/format.ts`, compartilhada
    com a lista Pipeline do desktop). Tocar numa linha abre o **mesmo** detalhe usado no modo
    Revisar (`CandidateStory`) — com "Voltar à lista" no cabeçalho. Aprovar/recusar só
    aparecem quando a candidatura ainda está `PENDING`; decidida abre em modo leitura (mesma
    regra da placa do desktop). Estado vazio quando a campanha não tem candidatura nenhuma.
    Fecha o buraco de o celular não ter superfície nenhuma pra ver quem já foi aprovado ou
    recusado — assimetria com o desktop que feria `D-10` (mobile-first).
- Swipe pra cima (ou "Ver posts") abre um painel com a mensagem da candidatura e o feed de
  Instagram, sem perder a posição na fila.
- Nas duas superfícies o `@handle` da creator é um link pro perfil dela no Instagram
  (`https://instagram.com/<handle>`, `target="_blank"`) — a marca abre o Instagram real se
  quiser antes de decidir.
- Logo abaixo do `@handle`, quando `influencer.phone` existe, aparece como link `tel:<phone>` —
  é o único contato direto que a marca tem com a creator (ver `creator-discovery-and-apply`).
  Ausente pra quem se candidatou antes do campo existir ou por um caminho que ainda não coleta
  telefone; nesse caso a linha simplesmente não aparece, sem placeholder.
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
- [x] Mobile "Revisar" (modo padrão) mostra só candidaturas `PENDING`, uma por vez.
- [x] Mobile "Todas" mostra toda candidatura da campanha, qualquer status, com rótulo de status;
      tocar numa linha abre o detalhe; decidida abre sem Aprovar/Recusar; `PENDING` ainda decide.
- [x] Alternar entre "Revisar" e "Todas" não sai do modo imersivo nem navega de rota; "Voltar à
      lista" a partir de um detalhe de "Todas" volta pra lista, não pra fora da revisão.
- [x] Aprovar ou rejeitar no modo mobile "Revisar" avança automaticamente pro próximo pendente.
- [x] O polling de 6s roda somente enquanto houver candidatura `PENDING` com IG também
      `PENDING`; para depois de 45s contínuos nessa condição.
- [x] O cronômetro de 45s reinicia se, a qualquer momento, deixar de haver alguém pendente.
- [x] "Fechar revisão" no mobile não dispara navegação de rota.

## Known Gaps
- **"Match Score" é placeholder E continua em inglês de propósito.** Foi o único rótulo deixado
  de fora da tradução de 2026-08-23: traduzi-lo daria aparência de métrica nativa a um número
  que não é calculado, o que agrava a contradição com `vision.md` nº 5 em vez de só mantê-la.
  Decisão sobre remover ou manter está com o Pedro.
- **"Match Score" é placeholder** (hash determinístico do id da candidatura, sem cálculo real) —
  já registrado em "Out of Scope" como decisão deliberada, repetido aqui porque um número de 70
  a 95 na tela é indistinguível de métrica real pra quem olha. Não tem teste de propósito: o que
  vale travar é que ele não finge vir do dado da creator, não o valor em si.
(O gap "nenhum teste automatizado cobre esta capacidade", do retrofit de 2026-08-21, foi
**fechado em 2026-08-23** — ver Test Coverage e Change History.)

## Test Coverage
Fixtures compartilhadas pelos dois arquivos: `apps/web/src/test/fixtures/applications.ts`
(mesmo formato de `GET /applications/campaign/:id`).

`apps/web/src/pages/brand/CampaignFilaTab.spec.tsx` — query real (não mockada), só as mutations
são dubladas:
- [x] Pipeline lista candidatura de todo status; empty state.
- [x] Seleção default (primeira) e troca de selecionada ao clicar na linha.
- [x] Aprovar/recusar só aparecem em `PENDING` e disparam com o id da selecionada.
- [x] Poll de 6s enquanto há `PENDING` com IG `PENDING`; nenhum poll quando não há.
- [x] Candidatura já decidida com IG pendente **não** mantém o poll vivo.
- [x] Poll para depois de 45s contínuos (verificado por mutação: desligar o teto no componente
      faz este teste falhar).
- [x] Cronômetro zera quando o IG chega — fila pendente futura volta a pollar do zero.
- [x] Telefone da creator aparece como link `tel:` na placa de detalhe; some quando `phone`
      é `null`.

`apps/web/src/pages/brand/CampaignPipelineMobileStory.spec.tsx` — componente controlado por
props, nenhum hook mockado:
- [x] Recorte da fila (modo "Revisar"): só `PENDING`; sem pendente, cai direto no fim de fila;
      nada de fim de fila prematuro durante o carregamento.
- [x] Modo "Todas": lista toda candidatura com o rótulo de status; mostra as decididas mesmo sem
      nenhuma `PENDING`; estado vazio; tocar numa linha abre o detalhe sem sair da revisão;
      detalhe de decidida não oferece Aprovar/Recusar; detalhe de `PENDING` ainda decide;
      "Voltar à lista" retorna sem sair; alternar de volta pra "Revisar" volta ao Story.
- [x] Navegação: zonas de toque, limite no primeiro candidato, swipe horizontal, arraste curto
      e arraste vertical ignorados.
- [x] Painel de detalhes: abre em "Ver posts"; com ele aberto, o toque na lateral fecha em vez
      de avançar (não perde a posição).
- [x] Tally: conta cada candidatura cuja decisão o servidor confirmou (o status na lista
      revalidada virou `APPROVED`/`REJECTED`), chaveada por id — decidir a mesma de novo não
      conta em dobro. Ações desabilitadas com decisão em voo.
- [x] Estados de IG: OK, `FAILED`, `null` tratado como falha, cooldown 429 bloqueando o botão.
- [x] Saída: "Fechar revisão" e "Voltar para a campanha" chamam `onExit`, sem navegação.
- [x] Telefone da creator aparece como link `tel:`; some quando `phone` é `null`.

## Current Implementation
- Constantes `POLL_INTERVAL_MS = 6_000` / `POLL_TIMEOUT_MS = 45_000`, definidas em
  `CampaignFilaTab.tsx`. O timeout de 45s é controlado por um `useEffect` com `pollStartRef`
  contando o tempo contínuo em condição de pendência.
- Modo mobile: estado `mode: 'review' | 'all'` + `allSelectedId` em `CampaignPipelineMobileStory`.
  `CandidateStory` é o mesmo componente nos dois modos; a barra de ação é gateada por
  `application.status === 'PENDING'`. O rótulo de status (`applicationStatusWord`) foi extraído
  de `CampaignFilaTab` pra `utils/format.ts` — desktop e mobile leem do mesmo lugar.
- `matchScore` (placeholder, ver "Out of Scope"): `hash = hash*31 + charCode` sobre
  `application.id`, depois `70 + hash % 26`.
- "Bio Note" na UI mostra `application.message` (dado real da creator) — apesar do nome sugerir
  algo mais elaborado, não é um campo separado nem calculado.
- Breakpoints Tailwind: desktop `hidden lg:grid`, mobile `lg:hidden`.
- Estado (query + mutations `useApproveApplication`/`useRejectApplication`/
  `useRefreshApplicationIg`) vive em `CampaignFilaTab` e é passado como props pro componente
  mobile.
- Tally mobile: `CampaignPipelineMobileStory` guarda `decided: Record<id, 'approved'|'rejected'>`
  (a intenção, gravada no clique) e deriva a contagem cruzando esse mapa com o `status` real de
  cada candidatura na lista revalidada — só entra no número quem o servidor confirmou. **Não usa
  o `onSuccess` com escopo do `mutate`**: ele é sobrescrito quando a decisão seguinte sai antes
  de a anterior liquidar (o `invalidateQueries` do hook ainda revalidando mantém `isPending`,
  mas a candidatura já avançou e o botão reabilita), e o tally vinha zerado por isso.

## Change History
- 2026-08-31 · telefone da creator (`influencer.phone`, ver `creator-discovery-and-apply`)
  passou a aparecer como link `tel:` logo abaixo do `@handle`, nas duas superfícies — mesmo
  tratamento condicional do `@handle` (some quando ausente, sem placeholder). 4 testes novos.
- 2026-08-21 · retrofit inicial a partir do código em produção.
- 2026-08-21 · reestruturado pro padrão SDD. Mudança conceitual: seção "API / Interfaces" foi
  omitida de propósito (capacidade sem endpoint próprio — os endpoints consumidos já estão
  documentados em `applications-pipeline`, listá-los de novo aqui seria duplicação).
- 2026-08-23 · capacidade sai de zero cobertura automatizada: 30 testes novos nos dois
  componentes, com a lógica de poll (intervalo, teto de 45s, reset do cronômetro) exercitada
  contra a query real em vez de hook mockado. O teste do teto foi validado por mutação — sem
  isso ele passaria mesmo com a proteção desligada.
- 2026-08-27 · bug: o resumo de fim de fila do mobile mostrava sempre `0 / 0 / 0`. O tally
  dependia do `onSuccess` com escopo do `mutate`, que é sobrescrito a cada nova decisão tomada
  antes de a anterior liquidar. Reescrito pra derivar da lista revalidada cruzada com um mapa de
  intenções por id. As decisões em si (approve/reject) sempre funcionaram — só a contagem
  estava quebrada.
- 2026-08-27 · paridade mobile: a Fila mobile só tinha o Story `PENDING` — nenhuma superfície pra
  ver aprovadas/recusadas no celular, assimetria com o desktop que feria `D-10`. Ratificado pelo
  `/feature` como conserto de paridade (não tela nova; o cadastro manual de creator avaliado
  junto foi rejeitado — ver `decisions.md`). Adicionado o modo "Todas" (lista de toda candidatura
  + detalhe reusando `CandidateStory` em modo leitura pra decididas). `applicationStatusWord`
  movido pra `utils/format.ts`. 8 testes novos.
