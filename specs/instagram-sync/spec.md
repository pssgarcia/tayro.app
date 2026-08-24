---
slug: instagram-sync
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-23
implements:
  - apps/api/src/modules/instagram/instagram-sync.service.ts
  - apps/api/src/modules/instagram/instagram.module.ts
  - apps/api/src/modules/instagram/providers/rapidapi.instagram.provider.ts
  - apps/api/src/modules/instagram/providers/stub.instagram.provider.ts
  - apps/api/src/modules/instagram/ig-avatar.controller.ts
  - apps/api/src/modules/instagram/ig-image.service.ts
  - apps/api/prisma/schema.prisma#IgImage
  - apps/api/src/modules/instagram/engagement.utils.ts
  - apps/api/src/modules/applications/application/applications.service.ts
related_decisions: [D-16, D-E]
---

# Sincronização de dados do Instagram

## Objective
Retrofit — sem processo `/feature` original registrado. Construída ao longo de várias
releases (documentadas em `CLAUDE.md` → "Feito"): integração real via RapidAPI, correções de
dado incompleto/fallback de foto, e o proxy de avatar que fecha um bloqueio real do Instagram.
É a base de dado externo que sustenta a avaliação de creator pela marca — sem isto, a marca
decide sem seguidores, engajamento ou feed.

## Scope
Busca e cache de dados públicos do Instagram de uma creator (seguidores, engajamento, posts
recentes, foto de perfil), a política de quando reconsultar, e a exibição das imagens sem
violar a política de origem cruzada do Instagram.

Inclui a **persistência das próprias imagens** (foto de perfil e thumbnails do feed), não
apenas dos endereços delas — ver "Behavior → Persistência de imagem".

## Out of Scope
- **Fila assíncrona (BullMQ + Redis)** é o alvo declarado (`D-16`, `PROPOSTA`), ainda não
  implementado. Hoje o disparo é fire-and-forget síncrono na prática, sem retry automático além
  do cooldown manual — ver Known Gaps.
- Botão "Atualizar" na interface (onde aparece, quando fica habilitado) — isso é UI de
  `applications-pipeline`/`campaign-fila-review`, que consomem este serviço.
- **Migração para a API oficial do Instagram.** Avaliada e recusada em 2026-08-23: ela só lê
  dados de quem autorizou o app por OAuth, o que exigiria a creator conectar a conta antes de a
  marca ver qualquer coisa — quebrando o fluxo de candidatura espontânea sem conta, que é o
  produto (`D-17`). Não resolveria a expiração de qualquer forma: a API oficial também entrega
  URL de mídia temporária.
- **Contagem de "seguindo".** Não existe no dado hoje: o provedor mapeia apenas a contagem de
  seguidores. Exibir sem ter é fabricar métrica, o que `vision.md` nº 5 proíbe. Entra só depois
  de confirmado que o provedor devolve o campo — ver Known Gaps.

## Domain
Sem modelo próprio — escreve nos campos de Instagram de `Influencer`: `followersCount`,
`igEngagementRate`, `igRecentPosts` (JSON), `igProfilePicUrl`, `igFetchedAt`, `igFetchStatus`
(`PENDING`/`OK`/`FAILED`). A fonte de dado é um provedor plugável (hoje: um stub determinístico
para dev/teste, ou a integração real via RapidAPI).

`IgImage` guarda as imagens em si, separada de `Influencer` de propósito: os bytes nunca podem
ser arrastados por uma listagem de candidatura. Uma imagem é identificada por
(creator, tipo, posição) — tipo é foto de perfil ou post do feed; posição distingue os posts
entre si. Cada imagem carrega o endereço de origem, o tipo de mídia e o tamanho em bytes.
A imagem pertence à creator: se a conta dela deixa de existir, as imagens vão junto, sem
rotina de limpeza (relevante enquanto `D-E` estiver aberta).

**Restrição externa que molda o design (não negociável):** o Instagram serve fotos de **perfil**
com uma política de origem que impede exibi-las diretamente num `<img>` de outro domínio —
mesmo sendo uma URL pública e válida. Essa política não se aplica às thumbnails de **feed**
(mesmo provedor, media diferente). Nenhuma configuração do lado do navegador contorna isso; a
única forma de exibir a foto de perfil é servi-la a partir do próprio domínio.

**Segunda restrição externa, descoberta em 2026-08-23:** as URLs da CDN do Instagram são
**assinadas e temporárias**. Guardar o endereço não é guardar a imagem — passado o prazo, a CDN
recusa e a imagem some da tela. É por isso que o sistema guarda os bytes, e não o endereço.

## Behavior

### Busca de perfil e feed
- Buscar o perfil é **obrigatório**: falhar a busca do perfil falha a sincronização inteira.
- Buscar o feed é **best-effort**: falhar a busca do feed (incluindo conta privada) não
  descarta o perfil já obtido — o resultado nesse caso é perfil salvo, feed vazio.
- A foto de perfil usada é a de maior resolução disponível; se essa não vier no retorno do
  provedor, cai para a foto padrão disponível; se nenhuma vier, fica sem foto.

### Staleness e atualização manual
- Uma busca só é refeita automaticamente se os dados salvos tiverem mais que um período de
  validade configurado — dentro desse período, uma nova tentativa de busca é pulada e os dados
  salvos são considerados atuais.
- Uma atualização manual (acionada pela marca) pode forçar a busca mesmo dentro do período de
  validade, mas está sujeita a um intervalo mínimo entre tentativas — **independente do
  resultado da tentativa anterior ter sido sucesso ou falha**, porque cada tentativa tem custo
  numa API externa paga. Esse intervalo mínimo é imposto por quem chama este serviço (ver
  `applications-pipeline`), não por este módulo — documentado aqui porque é parte do contrato
  de uso: uma falha marca o horário da tentativa mesmo sem sucesso, e é esse carimbo que faz o
  intervalo mínimo valer mesmo em sequência de falhas.
- Falha na busca **preserva** os últimos dados válidos conhecidos (seguidores, posts, foto não
  são zerados) — só o status muda para "falhou".

### Exibição da foto de perfil (proxy)
Pra respeitar a restrição de origem cruzada do Instagram (ver "Domain"), a foto de perfil é
servida através do domínio da própria aplicação, nunca linkada direto pra CDN do Instagram no
frontend. Isso é público de propósito — carregado via `<img>`, que não carrega credencial de
sessão. Por ser uma rota pública que busca uma URL persistida, ela precisa fechar o risco de
SSRF (nunca buscar uma URL fora de uma lista de hosts permitida, nunca aceitar a URL vinda do
cliente) — ver "Error Scenarios".

### Persistência de imagem
- Toda sincronização bem-sucedida **guarda as imagens**, não só os endereços: a foto de perfil e
  as thumbnails dos posts recentes.
- **Guardar imagem é best-effort.** Falha ao baixar não marca a sincronização como falha, não
  apaga a imagem anterior e não bloqueia a gravação dos dados numéricos — mesma regra já
  aplicada à preservação de seguidores.
- Re-sincronizar **substitui** a imagem daquela posição, nunca acumula.
- Uma imagem só é aceita se vier de um endereço da lista de hosts permitidos, com tipo de mídia
  de imagem reconhecido e tamanho dentro do teto. Fora disso é descartada, e a anterior
  permanece.
- Quem pede uma imagem que ainda não foi guardada (creator que se candidatou antes desta
  capacidade existir) dispara a gravação naquele momento, a partir do endereço guardado. Isso
  torna a adoção gradual: não existe migração de dados nem janela de indisponibilidade.
- A imagem é servida **sempre a partir do TAYRO**, com o tipo de mídia que foi guardado — nunca
  o que o servidor de origem declarar no momento da entrega.

### Identidade visual da creator
A foto de perfil da creator no TAYRO **é** a foto do Instagram dela. Vale em toda superfície que
mostra uma creator: fila de candidaturas, conteúdos entregues, recompensas, perfil público e o
perfil dela mesma. Não há montagem manual de foto como parte deste fluxo.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| `GET` | `/ig/avatar/:influencerId` | nenhum (rota pública, sem limite de taxa) | Foto de perfil servida do próprio domínio. `404` quando não há imagem nem endereço de origem. |
| `GET` | `/ig/post/:influencerId/:position` | nenhum (rota pública, sem limite de taxa) | Thumbnail de um post recente. `position` fora da faixa válida → `404`, sem consulta ao banco. |
| `PATCH` | `/applications/:id/refresh-ig` | `BRAND` + limite de taxa | Força nova busca, sujeito ao intervalo mínimo entre tentativas. Contrato pertence à spec `applications-pipeline`. |

## Acceptance Criteria
- [x] Após uma sincronização bem-sucedida, a foto de perfil e as thumbnails continuam
      aparecendo **mesmo depois de o endereço original ter expirado**.
- [x] Falha ao guardar imagem não marca a sincronização como falha nem apaga a imagem anterior.
- [x] Re-sincronizar substitui a imagem da mesma posição, sem acumular duplicatas.
- [x] Imagem acima do teto de tamanho ou com tipo de mídia não permitido é descartada, e a
      anterior permanece.
- [x] A imagem é servida com o tipo de mídia **guardado**, nunca com o declarado pelo servidor
      de origem no momento da entrega.
- [x] Creator que se candidatou antes desta capacidade passa a ter imagem guardada no primeiro
      acesso, sem migração de dados.
- [x] Nenhuma listagem de candidatura traz os bytes das imagens — só a rota que serve a imagem
      os consulta.
- [x] A foto que a marca vê na fila é a mesma que aparece em conteúdos, recompensas, perfil
      público e no perfil da própria creator.
- [x] Busca com perfil indisponível falha a sincronização inteira e marca status de falha.
- [x] Busca com feed indisponível ou conta privada preserva o perfil já obtido; feed fica vazio.
- [x] Dentro do período de validade, uma nova busca automática é pulada.
- [x] Uma falha marca o horário da tentativa, mesmo sem sucesso.
- [x] Uma falha nunca apaga dados válidos anteriores (seguidores, posts, foto).
- [x] A foto de perfil é obtida a partir de uma URL persistida no banco, nunca fornecida pelo
      cliente da rota de exibição.
- [x] A rota de exibição da foto só busca hosts numa lista permitida.
- [x] O núcleo do contrato (staleness, preservação em falha, carimbo em falha) tem teste de
      unidade dedicado — hoje só é exercitado indiretamente por quem chama o serviço (ver Known
      Gaps).

## Error Scenarios
- Perfil não obtido após as tentativas configuradas → sincronização marcada como falha; dados
  anteriores preservados.
- URL da foto ausente, com host fora da lista permitida, ou protocolo diferente de HTTPS →
  proxy responde `404` (nunca redireciona nem tenta buscar mesmo assim); frontend cai para
  iniciais.
- Upstream da foto indisponível ou expirado → proxy responde `404`.
- Intervalo mínimo entre tentativas manuais não respeitado → `429` (imposto em
  `applications-pipeline`, não aqui).

- Pedido de imagem para creator inexistente, sem imagem guardada e sem endereço de origem →
  `404`; a interface cai nas iniciais (avatar) ou no espaço vazio (grade de posts).
- Pedido de thumbnail com posição fora da faixa válida → `404`, **sem consultar o banco**.
- Endereço de origem fora da lista de hosts permitidos → `404` e **nenhuma requisição externa é
  feita** (proteção contra requisição forjada pelo servidor).
- Servidor de origem recusa ou expira durante a gravação → a imagem anterior permanece intacta;
  nada parcial é gravado.

## Known Gaps
- **Contagem de "seguindo" não existe no dado.** O provedor mapeia apenas seguidores; não há
  campo de *following* na interface do provedor, no modelo nem na resposta da API. Pedido pelo
  Pedro em 2026-08-23 para a placa de perfil — **não implementado de propósito**: exibir sem ter
  seria fabricar métrica (`vision.md` nº 5). Precisa antes de confirmação de que o provedor
  devolve o campo.
- **`avatarUrl` continua editável à mão** no perfil da creator, o que cria uma segunda fonte de
  verdade para a foto — contradiz "a foto do TAYRO é a do Instagram". Destino do campo ainda não
  decidido; ver `creator-account`.
(O gap "Imagem some depois de um tempo — URL de CDN expirada" foi **fechado em 2026-08-23**:
o sistema passa a guardar os bytes, e o endereço da CDN vira só origem de backfill. Ver Change
History.)
  `[FATO — verificado 2026-08-23]` O que é guardado no banco é a **URL assinada** da CDN
  (`igProfilePicUrl`, e o `thumbnail` de cada item de `igRecentPosts`), não a imagem. Essas URLs
  carregam assinatura com validade; passado o prazo, a CDN responde 403 e a foto desaparece da
  tela — para a foto de perfil via o proxy (que devolve 404 e renderiza vazio) e, mais visível
  ainda, para as thumbnails do feed, que o frontend carrega direto da CDN sem proxy.
  A renovação só acontece em dois momentos: na candidatura (fire-and-forget) e no botão
  "Atualizar" manual. **Não existe nenhuma renovação agendada** — confirmado por grep: os únicos
  chamadores de `refresh()` são `CreatorsService.findOrCreateInfluencer` e
  `ApplicationsService.refreshInfluencerIg`. Logo, candidatura antiga que ninguém reabre fica
  com imagem quebrada por tempo indeterminado, e o período de validade de 24h nunca é avaliado
  porque nada dispara a avaliação.
  **Trocar de provedor não resolve isto:** a API oficial do Instagram também entrega URL de
  mídia temporária. O que resolve é deixar de guardar URL e passar a guardar a imagem (ou
  cachear os bytes no primeiro acesso do proxy) — decisão de arquitetura ainda não tomada,
  passar pelo `/architect`.
- **Fila assíncrona (`D-16`) ainda não existe.** O disparo hoje é fire-and-forget síncrono, sem
  retry automático além do cooldown manual.
(Os dois gaps de cobertura de teste desta seção foram **fechados em 2026-08-23** — ver Test
Coverage e Change History.)

## Test Coverage
- `apps/api/src/modules/instagram/engagement.utils.spec.ts` — [x] cálculo de taxa de
  engajamento, isolado.
- `apps/api/src/modules/instagram/ig-avatar.controller.spec.ts` — [x] proxy, lista de hosts
  permitida, resposta 404.
- `apps/api/src/modules/instagram/providers/rapidapi.instagram.provider.spec.ts` — [x] fluxo de
  2 passos, novas tentativas do perfil, feed best-effort, fallback da foto de perfil.
- `apps/api/src/modules/instagram/instagram-sync.service.spec.ts` —
  [x] não chama o provedor sem influencer ou sem handle; [x] pula busca com dado fresco + `OK`;
  [x] rebusca fora da janela; [x] `FAILED` nunca conta como fresco; [x] janela configurável;
  [x] `force` ignora a janela; [x] marca `PENDING` antes de buscar; [x] grava seguidores/foto/
  posts/engajamento e carimba `OK`; [x] normaliza `@` no handle; [x] falha não propaga,
  carimba `FAILED` + horário, e **preserva** seguidores/foto/posts; [x] loga o motivo real.
- [x] Intervalo mínimo entre tentativas manuais — coberto em
      `applications.service.decision.spec.ts` (`429` com `waitMinutes`, fora do cooldown,
      não-dono, influencer inexistente).

Persistência de imagem (a escrever **antes** do código):
- [x] Sincronização bem-sucedida guarda foto de perfil e thumbnails.
- [x] Falha ao baixar imagem: sincronização continua `OK`, imagem anterior preservada.
- [x] Re-sincronização substitui a mesma posição (idempotente), sem duplicar.
- [x] Descarta imagem acima do teto de tamanho.
- [x] Descarta tipo de mídia fora da lista permitida.
- [x] Rota de imagem serve o que está guardado.
- [x] Rota de imagem grava no primeiro acesso quando ainda não há imagem (adoção gradual).
- [x] Rota de imagem devolve `404` sem imagem e sem endereço.
- [x] Host fora da lista permitida: `404` e **nenhuma requisição externa** (regressão do teste
      de requisição forjada que já existe).
- [x] Posição de post fora da faixa: `404` sem consulta ao banco.
- [x] Tipo de mídia devolvido é o guardado, não o declarado pela origem.
- [x] **Trava de regressão de performance:** as listagens de candidatura não trazem bytes de
      imagem — o teste falha se alguém acrescentar o campo a um `select`.
- [x] Frontend: conteúdos e recompensas exibem a foto do Instagram e caem nas iniciais sem
      imagem; a grade de posts aponta para o TAYRO, não para a CDN.

## Current Implementation
- `InstagramProvider` (interface `fetchProfile(handle)`) + token de injeção
  `INSTAGRAM_PROVIDER`, resolvido em `InstagramModule` por variável de ambiente
  (`INSTAGRAM_PROVIDER=stub|rapidapi`, default `stub`).
- `RapidApiInstagramProvider`: passo de perfil com 3 tentativas e backoff `[0, 800, 2000]`ms;
  passo de feed sem retry, `{ items: [] }` em qualquer falha. Timeout por request via
  `AbortController` (`IG_FETCH_TIMEOUT_MS`, default 10000ms).
- Ordem de fallback da foto de perfil: `hd_profile_pic_url_info?.url ?? profile_pic_url ?? null`.
- Período de validade (staleness) default 24h via `IG_FETCH_STALENESS_HOURS`; intervalo mínimo
  entre tentativas manuais default 15min via `IG_REFRESH_COOLDOWN_MINUTES` (vive em
  `ApplicationsService.refreshInfluencerIg`, não neste módulo).
- Handle normalizado defensivamente (`replace(/^@+/, '')`) antes de chamar o provedor — cobre
  dado inserido fora do fluxo padrão (ex.: edição direta no banco) com `@` prefixado.
- Proxy: allow-list por sufixo de host (`.cdninstagram.com`, `.fbcdn.net`) + protocolo `https:`
  obrigatório, timeout de 8s, resposta cacheada 1 dia no navegador (`Cache-Control: public,
  max-age=86400`).
- Modelo `IgImage`
  (`influencerId`, `kind: PROFILE|POST`, `position`, `mimeType`, `byteSize`, `data: Bytes`,
  `sourceUrl`, `fetchedAt`), com `@@unique([influencerId, kind, position])` — o unique é o que
  torna o upsert do sync idempotente sem check-then-act, dispensando `$transaction`. Relação com
  `onDelete: Cascade`. Migration aditiva (cria tabela + enum), não destrutiva. Teto proposto de
  2 MB por imagem e allow-list de `Content-Type` (`image/jpeg|png|webp`) na gravação.
  Alternativas descartadas e o porquê ficam em `decisions.md` (`D-18`), não aqui.
  (Até 2026-08-23 esta seção afirmava que "o sync renova a URL antes de expirar"; era falso —
  não existe renovação agendada.)
- `calcEngagementRate(posts, followers)`: soma `likes + comments` de todos os posts, divide
  pelo NÚMERO DE POSTS (média por post), divide por `followers`, multiplica por 100 e arredonda
  a 1 casa decimal. Função pura. `null` quando não há posts ou `followers = 0`.
  (Até 2026-08-23 esta linha dizia `(likes+comments)/followers × 100`, omitindo a média por
  post — a fórmula descrita dava o dobro do valor real.)

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0+.
- 2026-08-21 · reestruturado pro padrão SDD. A restrição de origem cruzada do Instagram (antes
  descrita como "footgun" só na seção de implementação) foi promovida a `Domain`/`Behavior` —
  é uma restrição externa que qualquer redesenho futuro do proxy precisa continuar respeitando,
  não um detalhe de código a esquecer.
- 2026-08-23 · corrigida afirmação falsa em "Current Implementation" (o sync **não** renova a
  URL antes de expirar — não há renovação agendada) e reclassificado o item que estava em
  `CLAUDE.md` → "Bugs conhecidos" como "IG não vem completo na 1ª candidatura": o relato real do
  Pedro é que os dados **chegam certos** na primeira candidatura e as imagens **expiram depois**.
  Causa e consequência registradas em Known Gaps; correção ainda não desenhada.
- 2026-08-23 · `InstagramSyncService` saiu de zero cobertura: staleness, `force`, preservação
  do último valor bom em falha e o carimbo de horário mesmo em falha (o que sustenta o cooldown
  do refresh manual) passaram a ter teste. Corrigida junto a descrição de `calcEngagementRate`,
  que omitia a média por post e descrevia uma fórmula com o dobro do valor real.
- 2026-08-23 · `/architect` desenhou a **persistência das imagens** (foto de perfil e thumbnails
  do feed) em vez de só dos endereços, fechando por desenho o gap de imagem que sumia com a
  expiração da URL assinada da CDN. Escolha registrada em `D-18`: tabela dedicada no próprio
  banco, e não storage externo — sem fornecedor novo nem credencial nova (`D-A` aberta) e com
  exclusão resolvida por cascade (`D-E` aberta). Migração para a API oficial do Instagram foi
  avaliada e **recusada** no mesmo dia (quebraria a candidatura espontânea sem conta e não
  resolveria a expiração) — registrado em "Out of Scope". Nada implementado ainda: todos os
  critérios novos estão `- [ ]`.
- 2026-08-23 · **implementado**: `IgImage` (migration aditiva), `IgImageService` (allow-list de
  host, teto de 2 MB, allow-list de `Content-Type`, upsert idempotente pelo `@@unique`), rota
  `/ig/post/:influencerId/:position`, backfill no primeiro acesso e frontend consumindo as duas
  rotas. Achado ao escrever os testes: guardar imagem estava **dentro do `try` do sync**, então
  uma falha de imagem marcaria `FAILED` um sync que deu certo, apagando dado bom por causa de
  uma foto — corrigido com `catch` próprio, e o teste foi validado por mutação (sem a correção,
  ele falha). Known Gap da imagem que expirava fechado.
