---
slug: creator-discovery-and-apply
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-31
implements:
  - apps/web/src/hooks/useInstagramHandleCheck.ts
  - apps/api/src/modules/campaigns/presentation/campaigns.controller.ts
  - apps/api/src/modules/campaigns/application/campaigns.service.ts
  - apps/api/src/modules/creators/presentation/programs-public.controller.ts
  - apps/api/src/modules/creators/application/creators.service.ts
  - apps/web/src/pages/public/PublicApplyPage.tsx
  - apps/web/src/pages/public/BrowseProgramsPublicPage.tsx
  - apps/web/src/pages/influencer/BrowseProgramsPage.tsx
  - apps/web/src/pages/influencer/ProgramsList.tsx
  - apps/web/src/pages/influencer/ProgramDetailPage.tsx
  - apps/web/src/pages/influencer/ApplyModal.tsx
related_decisions: [D-05]
---

# Descoberta e candidatura da creator

## Objective
Retrofit — sem processo `/feature` original registrado; comportamento descrito a partir do
código em produção. Duas motivações documentadas em `CLAUDE.md` → "Feito" compõem esta
capacidade: (1) permitir que a creator autenticada decida com informação completa antes de se
candidatar, em vez de um modal abrir direto por cima da listagem; (2) dar acesso a programas
abertos a um visitante **sem conta**, atacando o risco (não testado por entrevista — `n=0`) de
a creator não querer criar mais uma plataforma antes de ver se vale a pena.

## Scope
Descoberta de programas pela creator (autenticada e anônima) e o fluxo de candidatura — tanto
público (cria conta) quanto autenticado (usa sessão existente).

## Out of Scope
- Máquina de estados de `Application` após criada — ver `applications-pipeline`.
- Ciclo de vida da conta `CLAIMABLE` criada no apply público (token, expiração, set-password) —
  ver `account-claim`.
- Descoberta de **creators pela marca** (o inverso desta capacidade) — não existe hoje; lacuna
  conhecida, ver `CLAUDE.md` → "Pendente".

## Domain
Não introduz modelo próprio. Opera sobre `Campaign` (ver `campaign-lifecycle`), cria
`User`/`Influencer` sob demanda no primeiro apply de um handle/e-mail nunca visto (conta
`CLAIMABLE`, ver `account-claim`) e cria `Application` (ver `applications-pipeline`).

`Influencer.name` e `Influencer.phone` são obrigatórios **neste fluxo** (campo de formulário,
não constraint de banco — `phone` é `String?` no schema porque outros caminhos de criação de
conta ainda não o coletam, ver Known Gaps). `phone` existe pra dar à marca um contato direto com
a creator além do @ do Instagram — é exposto na Fila de revisão (ver `campaign-fila-review`,
`applications-pipeline` → `influencerSelect`), nunca no perfil público (`getPublicProfile` não o
inclui).

## Behavior

### Três superfícies, uma listagem
- **Browse autenticado** (creator logada) — grid paginado de campanhas `ACTIVE`; o card só
  navega para o detalhe, nunca abre modal de candidatura direto da listagem.
- **Vitrine pública** (sem login) — mesma listagem; o destino do card depende de haver ou não
  sessão de creator ativa no momento do clique (detalhe autenticado se houver, fluxo público se
  não houver).
- **Detalhe do programa** (autenticado) — mostra a oferta completa, prazo, vagas, nichos e
  descrição antes de qualquer decisão. Se já existe candidatura da creator para a campanha
  (qualquer status), mostra o status em vez de permitir recandidatura — o par
  `(campanha, influencer)` é único, então uma segunda tentativa seria sempre rejeitada.

### Candidatura pública (sem login) — regras de negócio
1. A campanha precisa existir e estar `ACTIVE`; caso contrário a candidatura é recusada.
2. A pessoa é resolvida por Instagram handle primeiro; se não achar por handle, por e-mail.
3. Se o e-mail já pertence a uma conta que **não** é de creator (ex.: conta de marca), a
   candidatura é recusada — o fluxo público nunca reaproveita ou sobrescreve uma conta de outro
   papel.
4. Se a pessoa já tem conta de creator mas ainda não definiu senha (conta `CLAIMABLE` sem
   claim concluído), reaplicar a um programa reemite e reenvia o link de definição de senha
   automaticamente — é o único jeito de recuperar um link de claim expirado hoje (ver
   `account-claim`).
5. Se a pessoa já tem conta de creator sem handle de Instagram e/ou sem telefone registrado
   (cadastro criado por outro caminho, que ainda não coleta telefone), o handle e/ou o telefone
   usados nesta candidatura passam a ser os dela — só preenche o que estiver faltando, nunca
   sobrescreve um valor que ela já tinha.
6. Se a pessoa nunca existiu no sistema, uma conta de creator é criada (com senha que ninguém
   conhece — ver `account-claim`) e um e-mail de definição de senha é enviado.
7. **Concorrência:** duas candidaturas simultâneas com o mesmo handle/e-mail nunca resultam em
   contas duplicadas nem em erro de servidor não tratado — a segunda a chegar reaproveita o
   registro que a primeira acabou de criar.
8. Candidatar-se de novo à mesma campanha (mesma pessoa) é recusado — não cria uma segunda
   candidatura.
9. A busca de dados do Instagram da pessoa é disparada em paralelo e não atrasa nem condiciona
   a resposta da candidatura (best-effort, ver `instagram-sync`).
10. **Nada acessório derruba a candidatura.** A candidatura é o evento de conversão do produto
   — o único momento em que uma creator sem conta entra no funil. Emitir o token de claim,
   montar o link, enviar o e-mail e disparar a busca do Instagram são todos efeitos colaterais:
   qualquer um deles falhando (config ausente, provedor fora do ar, erro de escrita do token) é
   registrado e a candidatura segue. Só falha de verdade o que impede a candidatura de existir:
   campanha inválida, conta de outro papel, duplicidade e falha ao gravar a própria
   `Application`.

11. **O @ digitado é verificado antes do envio.** O handle é o único dado da candidatura pública
   que a marca usa pra decidir, e é digitado à mão por quem está com pressa, no celular. Um @
   errado cria uma creator fantasma: conta criada, candidatura na fila da marca e nenhum dado de
   Instagram, para sempre. Então o formulário verifica se o @ existe (ver `instagram-sync`) e
   **não deixa enviar** enquanto o desfecho for "não existe" — a pessoa corrige ali, com o campo
   na frente dela.
   - Desfecho **indeterminado** (provedor fora do ar, tempo esgotado, teto atingido) **não
     bloqueia**: a candidatura segue. Deixar de converter uma creator legítima porque uma API de
     terceiro piscou é exatamente o que a regra 10 existe pra impedir.
   - A verificação é do **dado de entrada**, não um efeito colateral: acontece enquanto a pessoa
     preenche o formulário, antes do envio. A regra 10 continua valendo inteira para o que vem
     depois (token de claim, e-mail, sincronização) — nada disso ganhou poder de derrubar a
     candidatura.
   - O endpoint de candidatura **não** repete a verificação. A garantia é do formulário, não do
     contrato da API: pôr uma chamada externa síncrona no caminho da conversão é o desenho que
     `decisions.md` recusou em 2026-08-26, e ela nunca protegeu contra ninguém — não é regra de
     segurança, é ajuda a quem digita.

Candidatura autenticada (creator já logada, via modal no detalhe do programa) segue as mesmas
regras 1 e 8, sem os passos de resolução/criação de conta (a sessão já identifica a pessoa).
**Ela não verifica handle nenhum**, e isso é deliberado: não existe campo de handle nesse fluxo —
o @ vem da conta, definido no cadastro. O ponto certo de verificar ali é o cadastro
(ver `creator-account`), não a candidatura.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| `GET` | `/campaigns` | opcional (viewer pode ser anônimo) | Só `status=ACTIVE`. Instrumentado com contador anônimo/autenticado. |
| `GET` | `/campaigns/:id` | opcional | `ACTIVE` é público; outro status só visível pro dono (404 uniforme). |
| `POST` | `/programs/:id/apply/public` | throttle 5 req/60s por IP | Público. Cria conta `CLAIMABLE` se necessário. `201`; `400` campanha não `ACTIVE`/inexistente; `409` e-mail já usado por não-creator ou candidatura duplicada; `429` throttle. |

Candidatura autenticada usa `POST /applications` (guard `INFLUENCER`) — contrato pertence à
spec `applications-pipeline`, não duplicado aqui.

A verificação do @ usa `GET /ig/handle/:handle` (pública, com limite próprio) — contrato pertence
à spec `instagram-sync`, não duplicado aqui.

## UI Behavior
- `/influencer/browse` (autenticado): card só navega, nunca abre modal.
- **A listagem é uniforme: todo programa aberto tem o mesmo peso visual.** Nenhum recebe
  destaque, porque não existe critério de curadoria — a ordenação é `createdAt desc` e nada
  mais. Se um dia houver regra de verdade (relevância, vagas restantes, nicho da creator), o
  destaque volta junto com ela, nunca antes. Cada programa é um **card em grade** (1 coluna no
  celular, 2 a partir de `sm`, 3 a partir de `xl`) mostrando título, marca, vagas e oferta — a
  oferta em escala de display, porque é o que faz a creator parar. A numeração é contínua entre
  páginas.
- `/programs` (público): mesmo componente de listagem; o link de cada card muda conforme há ou
  não sessão de creator no momento (autenticado → detalhe; anônimo → apply público).
- `/influencer/programs/:id` (autenticado): oferta, prazo, vagas, nichos, descrição. Três
  desfechos possíveis pro CTA: já tem candidatura → status + link pra ela (sem reabrir form);
  campanha não `ACTIVE` e sem candidatura → "Inscrições encerradas", sem CTA; caso contrário →
  botão que abre o modal de candidatura autenticada.
- `/apply/:id` (público, sem layout compartilhado): formulário com handle do Instagram,
  e-mail, nome, telefone (os quatro obrigatórios) e mensagem opcional. Nome e telefone viraram
  obrigatórios em 2026-08-31 — telefone é o único contato direto que a marca tem hoje pra falar
  com a creator fora do produto (ver Change History).
- **Verificação do @ no formulário público**, na ordem em que as coisas acontecem:
  1. Enquanto a pessoa digita, nada é verificado — verificar a cada tecla consulta um monte de
     prefixos que por acaso são o @ de outra pessoa (e responderiam "existe", dando um verde
     falso) e queima cota à toa.
  2. Ao sair do campo, se o formato for válido e o valor tiver mudado desde a última
     verificação, o @ é verificado. Enquanto isso, o campo mostra que está verificando.
  3. Ao enviar, se o @ atual ainda não tem desfecho, a verificação acontece antes do envio e o
     botão diz que está verificando. Um mesmo @ nunca é verificado duas vezes na mesma sessão da
     tela.
  4. Desfecho "não existe" bloqueia o envio e mostra o motivo **no campo do @**, não num aviso
     genérico no rodapé — o erro é daquele campo e é ali que ele se corrige.
  5. Desfecho "existe" mostra uma confirmação discreta no campo, sem número de seguidores nem
     foto (o TAYRO não promete nada sobre o perfil nesse momento, só que o @ existe).
  6. Desfecho "indeterminado" mostra um aviso neutro de que não deu pra conferir agora e
     **libera** o envio.
  7. Corrigir o @ depois de um bloqueio limpa o desfecho anterior — o botão volta a funcionar
     assim que houver um desfecho que não seja "não existe".

## Acceptance Criteria
- [x] Candidatura pública a campanha inexistente ou não-`ACTIVE` é recusada e nenhuma conta ou
      candidatura é criada.
- [x] E-mail já usado por conta que não é de creator é recusado; nenhuma conta é criada ou
      alterada.
- [x] Candidatura duplicada (mesma pessoa, mesma campanha) é recusada; não cria uma segunda
      `Application`.
- [x] Duas candidaturas públicas concorrentes com o mesmo handle nunca produzem duas contas nem
      erro de servidor — a segunda reaproveita a conta criada pela primeira.
- [x] Duas candidaturas públicas concorrentes com o mesmo e-mail (handles diferentes) têm a
      mesma garantia acima.
- [x] Reaplicar com conta ainda não reivindicada reemite e reenvia o link de definição de senha.
- [x] Reaplicar com conta já reivindicada **não** reemite nem reenvia o link.
- [x] Candidatura pública não espera a busca de dados do Instagram responder para retornar.
- [x] Falha ao montar ou enviar o link de definição de senha (incluindo configuração de
      ambiente ausente) **não** impede a criação da candidatura.
- [x] Falha ao emitir o link de definição de senha não impede a busca de dados do Instagram de
      ser disparada — os dois efeitos colaterais são independentes entre si.
- [x] Falha ao gravar a própria candidatura continua propagando como erro.
- [ ] Conta de creator existente sem handle de Instagram tem o handle preenchido ao se
      candidatar por este fluxo — comportamento implementado, sem teste dedicado (ver Known Gaps).
- [x] Formulário público não envia sem nome; sem telefone; ou com telefone em formato inválido —
      nenhuma requisição de candidatura sai do navegador nesses três casos.
- [ ] Conta de creator existente sem telefone tem o telefone preenchido ao se candidatar por
      este fluxo — comportamento implementado (mesmo padrão do handle acima), sem teste
      dedicado (ver Known Gaps).

Verificação do @ no formulário público:
- [x] @ com desfecho "não existe" não envia a candidatura — nenhuma requisição de candidatura
      sai do navegador.
- [x] @ com desfecho "indeterminado" **envia** normalmente.
- [x] Enviar com um @ ainda não verificado dispara a verificação antes e só então envia.
- [x] O mesmo @ não é verificado duas vezes seguidas na mesma tela (sair do campo e depois
      enviar consulta uma vez só).
- [x] Digitar não dispara verificação; só sair do campo ou enviar.
- [x] @ de formato inválido é barrado pela validação do formulário e não chega a ser verificado.
- [x] O motivo do bloqueio aparece no campo do @.
- [x] Corrigir o @ após um bloqueio destrava o envio.
- [x] A candidatura continua sendo aceita pela API sem nenhuma verificação de handle — o
      endpoint não ganhou dependência externa nova.

## Error Scenarios
- Campanha inexistente → `404` (candidatura autenticada) / recusa `400` explicitando o motivo
  (candidatura pública, mesma mensagem para "não existe" e "não está ativa" — não distingue os
  dois casos pro cliente).
- E-mail pertencente a conta que não é de creator → `409`, sem detalhar de quem é a conta.
- Candidatura duplicada → `409`.
- Mais de 5 tentativas de candidatura pública por IP em 60s → `429`.
- @ que não existe no Instagram → o formulário bloqueia o envio e explica no campo do @;
  nenhuma conta e nenhuma candidatura são criadas, porque nada é enviado.
- Verificação do @ falha (provedor fora do ar, `429` da rota de verificação, rede) → tratada
  como "indeterminado": aviso neutro e **envio liberado**. Uma verificação que não responde
  nunca vira uma candidatura perdida.
- @ que existe no Instagram mas já pertence a outra conta do TAYRO → segue sendo o `409` de
  sempre, no envio. São dois erros diferentes, em dois momentos diferentes: existir no Instagram
  e estar livre no TAYRO não são a mesma pergunta.

## Known Gaps
(O gap "sem teste de frontend para `PublicApplyPage`" foi **fechado em 2026-08-23** — a
superfície de maior risco da capacidade, única sem guard e que cria conta, passou a ter
cobertura. Ver Test Coverage.)
- **Branch "preenche o handle (ou o telefone) de uma conta existente que não tem" sem teste
  dedicado** — implementado (`creators.service.ts`, dentro de `findOrCreateInfluencer`), mas
  nenhum dos specs existentes exercita esse caminho especificamente.
- **`Influencer.phone` só é coletado por este fluxo.** Cadastro direto (`creator-account`) e
  candidatura autenticada (via `ApplyModal`, `applications-pipeline`) não pedem telefone —
  uma creator que nunca passou pelo apply público não tem telefone registrado, e não há tela
  de perfil onde ela possa preenchê-lo depois (o campo não está em `PATCH /influencers/me`).
  Decisão consciente de escopo (2026-08-31): o pedido era só este formulário; ampliar para os
  outros dois caminhos e para a edição de perfil é mudança separada.
- Nenhuma tela de detalhe pública própria existe: `/apply/:id` cumpre esse papel também pro
  visitante anônimo. Não é gap — é a decisão de escopo registrada em `roadmap.md`.

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.race.spec.ts` —
  [x] campanha inexistente → 404, [x] campanha não-`ACTIVE` → 400, [x] e-mail usado por conta
  de marca → 409, [x] candidatura duplicada → 409, [x] colisão concorrente por handle (RC-1,
  reaproveita registro), [x] colisão concorrente por e-mail (RC-2, reaproveita registro),
  [x] guarda de N+1 (≤1 query por tabela em `applyPublic`).
- `apps/api/src/modules/creators/application/creators.service.claim.spec.ts` —
  [x] conta nova grava token de claim e envia e-mail com o link, [x] reapply sem claim reemite
  e reenvia, [x] reapply já claimado não reemite nem reenvia.
- Frontend: `BrowseProgramsPage.spec.tsx`, `ProgramsList.spec.tsx`, `ProgramCard.spec.tsx`,
  `ProgramDetailPage.spec.tsx`, `ApplyModal.spec.tsx`, `BrowseProgramsPublicPage.spec.tsx`.
- `apps/web/src/pages/public/PublicApplyPage.spec.tsx` —
  [x] carga da campanha (oferta + marca), [x] campanha inexistente mostra "campanha não
  encontrada", [x] `DRAFT`/`CLOSED`/`COMPLETED` não mostram formulário, [x] payload enviado à
  rota pública, [x] normalização de `@` e caixa alta antes do envio, [x] confirmação na própria
  placa sem navegar, [x] handle e e-mail inválidos barrados antes da API, [x] respostas
  `409` (com e sem mensagem usável), `429` e `500`, [x] formulário continua disponível pra nova
  tentativa após erro.
- [ ] Branch de preenchimento de handle/telefone em conta existente — não existe teste dedicado.
- `apps/api/src/shared/validation/dto-maxlength.spec.ts` → `describe('PublicApplyDto')` —
  [x] name vazio rejeitado, [x] phone vazio rejeitado, [x] phone acima de 20 chars rejeitado,
  [x] phone com caractere inválido rejeitado (junto dos limites de `message`/`name`/`email` já
  existentes).
- `PublicApplyPage.spec.tsx` ganhou 3 casos (2026-08-31): [x] envio sem nome bloqueado, [x] envio
  sem telefone bloqueado, [x] telefone com caractere inválido bloqueado — nenhum chama a API.

Verificação do @, em `PublicApplyPage.spec.tsx` → `describe('PublicApplyPage — verificação do @ do Instagram')`:
- [x] Desfecho "não existe" bloqueia: a rota de candidatura não é chamada.
- [x] Desfecho "indeterminado" não bloqueia: a rota de candidatura é chamada.
- [x] Envio com @ não verificado verifica primeiro e depois envia (a ordem é garantida por
      `await handleCheck.check(...)` acontecer antes do `try`/`api.post` no `onSubmit`; testado
      indiretamente pelos dois casos acima, que só fazem sentido se a ordem for essa).
- [x] Sair do campo e depois enviar o mesmo @ = uma verificação só.
- [x] Digitar sem sair do campo não verifica.
- [x] Mensagem de bloqueio renderiza no campo do @ (via `errors.igHandle`, mesmo mecanismo dos
      demais erros de campo desta tela — `PlateField` não usa `aria-describedby`, então
      "associado" aqui é o mesmo padrão de erro por campo já usado no resto da tela).
- [x] Trocar o @ após bloqueio permite enviar de novo.

## Current Implementation
- `CreatorsService.applyPublic` → `findOrCreateInfluencer` (resolve por
  `instagramHandle` `@unique`, depois por `email` `@unique` do `User`) → cria `Application`.
- `name`/`phone` são obrigatórios no `PublicApplyDto` (`@IsNotEmpty`); `phone` validado por
  regex simples (`/^[0-9()+\-\s]{8,20}$/`, mesma regra no zod do frontend) — não valida DDD nem
  formato brasileiro específico, só bloqueia texto claramente não numérico. Ao criar conta nova,
  os dois vão direto pro `Influencer.create`. Ao reaproveitar conta existente (achada por
  handle ou por e-mail), só o que estiver faltando (`instagramHandle`/`phone`) é gravado — nunca
  sobrescreve um valor que a creator já tinha.
- Colisão concorrente é tratada capturando `PrismaClientKnownRequestError` código `P2002` e
  rebuscando via `findExistingInfluencer` em vez de deixar vazar `500`.
- Criação de conta nova: `bcrypt.hash(randomUUID())` como senha, token de claim gerado por
  `randomBytes(32)` com hash SHA-256 persistido (`claimTokenHash`) e o token cru só no e-mail.
- Envio do e-mail de claim é `await`ado antes de retornar (não é fire-and-forget), mas passa por
  `offerAccountClaim`/`sendClaimEmailBestEffort`, que capturam qualquer falha e apenas logam. A
  busca de dados do Instagram roda via `InstagramSyncService.scheduleRefresh` (`setImmediate`),
  fora do ciclo da resposta HTTP.
- `hrefBuilder` em `ProgramsList`/`BrowseProgramsPublicPage` decide o destino do card lendo o
  estado de auth do Zustand store no momento do render.
- Verificação do @: hook dedicado `useInstagramHandleCheck` (`apps/web/src/hooks/`), compartilhado
  com `RegisterInfluencerPage` (ver `creator-account`). Expõe uma verificação imperativa (`check`,
  disparada por blur/submit, não é query declarativa), o `checking` em voo e o `{checkedHandle,
  result}` da última verificação — guarda internamente um `Map<handle, desfecho>` pra nunca repetir
  chamada do mesmo @; falha de rede vira `UNKNOWN` e **não entra no cache** (uma tentativa seguinte
  pode ter sorte). `PublicApplyPage` normaliza o handle antes de verificar com a mesma função usada
  no `.transform()` do schema zod (`@` removido, minúsculas, trim) — um só lugar pra essa regra,
  não duas cópias divergindo.

## Change History
- 2026-08-31 · **nome e telefone viraram obrigatórios em `/apply/:id`** (pedido do Pedro). Nome
  já era gravado no `Influencer` desde sempre (com fallback pro handle quando ausente — fallback
  removido, agora sempre vem do formulário); telefone é campo novo (`Influencer.phone String?`,
  migration `add_influencer_phone`) porque a marca não tinha nenhum contato direto com a
  creator — só o @ do Instagram, que não é canal garantido de resposta. Exposto no
  `influencerSelect` (`applications-pipeline`) e mostrado como link `tel:` ao lado do @ na Fila
  (`campaign-fila-review`, desktop e mobile) — sem essa ponta, o dado ficaria só no banco e não
  cumpriria o motivo de existir. **Não** exposto em `getPublicProfile` (dado de contato não é
  perfil público). Backfill de conta existente segue o mesmo padrão já usado pro handle (regra 5
  de Behavior) — só preenche o que falta, nunca sobrescreve.
- 2026-08-28 — listagem passa de linhas pra grade de cards (as duas superfícies: `/influencer/browse` e `/programs`). Conteúdo e destino do link inalterados; muda o arranjo e o peso da oferta.
- 2026-08-28 · **placa "Em destaque" removida da listagem de programas abertos** (as duas
  superfícies, `/influencer/browse` e `/programs`). O primeiro programa da página virava placa
  desde o redesign 2a, mas sem nenhum critério por trás: como a ordenação é `createdAt desc` e o
  corte era por página, "em destaque" significava só "o mais novo desta página" — na página 2
  outro programa qualquer ganhava a placa. Destaque sem regra é ruído e sugere curadoria que não
  existe. A variante `featured` do `ProgramCard` foi apagada junto (ficaria órfã); as vagas, que
  só a placa mostrava, passaram pra linha, então nada de informação se perdeu. Teste de
  regressão trava a lista uniforme (validado por mutação). Contraste que fica: no lado da marca
  (`CampaignsPage`) a placa **tem** regra — `pickFeatured` = programa ativo mais cheio — e por
  isso continua.
- 2026-08-27 · **implementada** a regra 11 desenhada em 2026-08-26 (ver entrada abaixo). Bloqueio
  acontece em `onSubmit` (reaproveita o desfecho do blur via `handleCheck.check`, que dedupe
  internamente); mensagem manual via `setError('igHandle', { type: 'manual', ... })`, limpa no
  próximo `onChange` do campo. Todos os critérios novos das seções anteriores viraram `- [x]`.
- 2026-08-26 · `/architect` acrescentou a **regra 11**: o @ digitado no formulário público é
  verificado contra o Instagram e "não existe" bloqueia o envio. O `/feature` tinha recusado a
  versão ampla disso em 2026-08-26 (bloquear a candidatura por um efeito acessório fere a regra
  10); o Pedro corrigiu o escopo na mesma data e o que entrou é mais estreito — validação do
  **campo que a pessoa está preenchendo**, antes do envio. A regra 10 fica intacta: nada depois
  do envio ganhou poder de derrubar a candidatura, e desfecho indeterminado libera o envio de
  propósito. O endpoint de candidatura continua sem chamada externa síncrona; a garantia é do
  formulário.
- 2026-08-24 · **bug de produção corrigido**: a 1ª candidatura de toda creator nova respondia
  `500` e só a 2ª passava. `FRONTEND_URL` estava ausente no Railway; o `getOrThrow` que monta o
  link do claim rodava DEPOIS de `user.create` já ter commitado a conta e ANTES de
  `application.create`, então a conta nascia sem candidatura e sem busca de Instagram agendada.
  Reproduzido na produção antes e depois da correção da variável (`500` → `201` na 1ª
  tentativa). Regra 10 de Behavior e os critérios novos existem para que a causa estrutural
  (efeito colateral acessório com poder de derrubar a conversão) não volte por outro caminho.
- 2026-08-21 · retrofit inicial a partir do código em produção (v0.36.0+, branch
  `feature/commission-offer-and-deadline-validation` incluída na leitura do
  `campaigns.service.ts`).
- 2026-08-21 · reestruturado pro padrão SDD. Correção de conteúdo: a versão anterior
  reportava "não existe teste cobrindo `applyPublic` fora do cenário de corrida" — falso;
  `creators.service.race.spec.ts` já cobre validações sequenciais (404/400/409) e
  `creators.service.claim.spec.ts` cobre o caminho de emissão/reemissão de claim. O gap real e
  específico é mais estreito: só o branch de preenchimento de handle numa conta existente.
- 2026-08-23 · `PublicApplyPage` ganhou cobertura de teste (15 casos): contrato de envio,
  normalização do handle e as quatro respostas de erro da API. Era a única tela do produto sem
  guard nenhum e sem teste.
- 2026-08-30 · terminologia de produto: "programa" passou a ser "campanha" em toda a copy visível (rótulos, botões, mensagens de erro, placeholders). Sem mudança de comportamento, rota, endpoint ou modelo de dados — só texto.
