---
slug: instagram-sync
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-26
implements:
  - apps/api/src/modules/instagram/instagram-sync.service.ts
  - apps/api/src/modules/instagram/instagram.module.ts
  - apps/api/src/modules/instagram/providers/rapidapi.instagram.provider.ts
  - apps/api/src/modules/instagram/providers/stub.instagram.provider.ts
  - apps/api/src/modules/instagram/ig-avatar.controller.ts
  - apps/api/src/modules/instagram/ig-handle.controller.ts (GET /ig/handle/:handle)
  - apps/api/src/modules/instagram/ig-profile-cache.ts
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

Inclui também a **verificação de existência de um @** — responder se um handle digitado por
alguém existe no Instagram, antes de esse handle virar conta ou candidatura. Quem consome essa
resposta (e o que faz com ela) é de outra capacidade: ver `creator-discovery-and-apply` e
`creator-account`.

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

A **verificação de existência de um @** é a única operação desta capacidade que não pertence a
uma creator: ela responde sobre um handle que talvez nunca vire conta. O resultado tem três
desfechos possíveis e só três — **existe**, **não existe**, **indeterminado** — e nunca carrega
dado de perfil junto.

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

### Verificação de existência de um @
- O sistema sabe responder, sob demanda, se um @ existe no Instagram. São três desfechos e só
  três: **existe**, **não existe** e **indeterminado** ("não deu pra saber agora").
- **"Não existe" só é afirmado com resposta conclusiva do provedor.** Provedor fora do ar, tempo
  esgotado, resposta ambígua ou teto de consumo atingido resultam em **indeterminado**, nunca em
  "não existe". Acusar o @ de alguém de inexistente porque o provedor está instável barra uma
  creator legítima, e esse erro custa mais que deixar passar um @ errado.
- **O `404` do provedor, sozinho, não é conclusivo.** A RapidAPI devolve `404` tanto para um @
  que realmente não existe quanto para uma conta real que ela não consegue ler (verificado em
  produção em 2026-08-29: `ramondinopro`, ~7M seguidores, conta verificada → `404`). Só conta
  como "não existe" o `404` cujo corpo traz a mensagem de erro explícita do Instagram
  (`"We're sorry, we couldn't find that."`); `404` com corpo vazio, não-JSON ou outra mensagem
  é **indeterminado**.
- A verificação **nunca consulta dados do TAYRO e nunca devolve dado de perfil** (seguidores,
  foto, feed). A resposta é o desfecho e nada mais. Ela também não diz se o @ já pertence a
  alguma conta do TAYRO — isso é outra pergunta, respondida no envio do cadastro/candidatura
  (ver `creator-account` e `creator-discovery-and-apply`).
- Um @ com formato impossível (fora do alfabeto que o Instagram aceita, ou longo demais) é
  recusado **sem consultar o provedor** — não se paga consulta externa por algo que não pode
  existir.
- A verificação é uma operação **cara e pública**: tem limite por origem e um **teto global de
  consultas ao provedor por minuto**. Atingido o teto global, o desfecho é indeterminado, sem
  fila de espera e sem erro na cara de quem perguntou.
- Verificar o mesmo @ de novo dentro de um período curto não consulta o provedor: o desfecho
  anterior é reaproveitado, inclusive o "não existe".

### Reaproveitamento da consulta de perfil
- A consulta de perfil feita numa verificação recente **serve** à sincronização que vem logo em
  seguida. Candidatura e cadastro não pagam duas vezes pela mesma informação: o custo por creator
  nova continua sendo o de sempre — um perfil e um feed.
- O reaproveitamento vale por um período curto e só para o passo de perfil; o feed é sempre
  buscado.
- A **atualização manual** (a marca pedindo dados novos) ignora o reaproveitamento — o propósito
  dela é justamente ir buscar de novo.
- Sincronizar um @ que a verificação apontou como conclusivamente inexistente não consulta o
  provedor de novo: a sincronização termina como falha, preservando os dados anteriores, como
  qualquer outra falha.

### Quando a sincronização é disparada
Toda porta pela qual uma creator entra no sistema ou se candidata dispara a sincronização —
essa é a regra, e ela vale para as três:
- **cadastro de creator** (com senha): ao criar a conta, que já nasce com status "em busca";
- **candidatura pública** (sem login): ao criar a candidatura;
- **candidatura autenticada** (creator já logada): ao criar a candidatura.

O disparo é sempre em background: a resposta HTTP nunca espera a API externa, e uma falha na
busca nunca derruba a ação que a originou. Como o disparo respeita o período de validade, um
ponto a mais chamando não multiplica consumo de cota — creator com dado fresco não toca no
provedor.

**Nenhuma creator deve chegar à fila da marca sem que ao menos uma tentativa de busca tenha
existido.** O status "em busca" desde a criação da conta é parte disso: a ausência de status é
lida como falha pela interface, então deixar o campo vazio faz a creator aparecer como "dados
indisponíveis" antes mesmo de alguém ter tentado buscar.

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
| `GET` | `/ig/handle/:handle` | nenhum (rota pública, documentada) + limite de taxa próprio, mais restrito que o padrão | Responde só o desfecho da verificação: `FOUND` \| `NOT_FOUND` \| `UNKNOWN`, com o handle normalizado. `200` nos três desfechos — indisponibilidade do provedor é `UNKNOWN`, não erro. `400` para handle de formato inválido, **sem** consultar o provedor. `429` no excesso por origem. Nunca devolve dado de perfil nem informação sobre contas do TAYRO. |
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
- [x] Cadastro de creator cria a conta já com status "em busca" e dispara a sincronização.
- [x] Candidatura autenticada dispara a sincronização da creator.
- [x] Candidatura pública dispara a sincronização, mesmo quando o envio do link de definição de
      senha falha.
- [x] O disparo retorna antes de a busca rodar — nenhuma resposta HTTP espera a API externa.
- [x] Falha na busca disparada em background é registrada e não vira exceção para quem disparou.
- [x] Candidatura recusada (programa inexistente, encerrado ou lotado) **não** dispara busca —
      não se queima cota de API por candidatura que não existiu.
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

Verificação de existência de @:
- [x] Handle de formato inválido é recusado sem nenhuma consulta ao provedor.
- [x] Resposta conclusiva de inexistência vira desfecho "não existe".
- [x] Provedor indisponível, tempo esgotado ou resposta ambígua viram "indeterminado" — nunca
      "não existe".
- [x] A resposta da verificação não contém seguidores, foto, feed, nem qualquer sinal de que o @
      já tem conta no TAYRO.
- [x] Verificar o mesmo @ duas vezes seguidas consulta o provedor uma vez só.
- [x] Excedido o limite por origem, a rota responde `429`; excedido o teto global por minuto, ela
      responde "indeterminado" sem consultar o provedor.
- [x] Sincronização disparada logo após uma verificação bem-sucedida do mesmo @ **não** repete a
      consulta de perfil (só o feed é buscado).
- [x] Atualização manual forçada ignora o reaproveitamento e consulta o provedor.
- [x] Sincronização de um @ conclusivamente inexistente não consulta o provedor e termina como
      falha, preservando os dados anteriores.
- [x] O provedor de desenvolvimento (determinístico) sabe produzir os três desfechos, para que o
      fluxo inteiro seja exercitável sem consumir cota real.
- [x] O mapeamento da resposta do provedor real para "não existe" está confirmado contra a API
      real (2026-08-27) — ver Known Gaps (a entrada foi resolvida, não removida).

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
- Verificação com handle de formato inválido → `400`, **sem** consulta externa.
- Verificação acima do limite por origem → `429`.
- Provedor fora do ar, lento ou respondendo algo inesperado durante uma verificação → `200` com
  desfecho "indeterminado". Erro de terceiro nunca vira `5xx` nosso nem stack trace na resposta.
- Provedor responde `404` sem o corpo de erro conclusivo do Instagram (conta real que ele não
  consegue ler, rate limit disfarçado) → desfecho "indeterminado", não "não existe".
- Teto global de consultas por minuto atingido → `200` com "indeterminado"; nenhuma requisição
  externa é feita.

## Known Gaps
- **(RESOLVIDO 2026-08-29) O mapeamento `404 → NOT_FOUND` era cru demais e gerava falso
  negativo em produção.** A verificação em prod com tráfego real (que faltava fazer) mostrou
  que `ramondinopro` (~7M seguidores, conta verificada e real) responde `404` — a RapidAPI não
  consegue ler certas contas e devolve o mesmo status de "não existe". O código bloqueava a
  candidatura dessa creator. **Fix:** `checkHandle` passou a exigir o corpo de erro explícito
  do Instagram (`"couldn't find that"` / equivalentes) para afirmar `NOT_FOUND`; qualquer outro
  `404` vira `UNKNOWN` e **libera** o envio. O `404` conclusivo de um @ realmente inexistente
  (corpo `{"status":"error","error":"We're sorry, we couldn't find that."}`, confirmado por
  `curl` em 2026-08-27) continua bloqueando. Ver `decisions.md` `D-19`.
- **O reaproveitamento da consulta de perfil vive na memória do processo.** Se a API rodar em mais
  de uma instância, ou reiniciar entre a verificação e a candidatura, o reaproveitamento
  simplesmente não acontece e paga-se o perfil duas vezes. É degradação silenciosa, sem quebra
  funcional — e some quando existir infraestrutura compartilhada (`D-16`). Mesmo motivo pelo qual
  o teto global de consultas por minuto também é por processo: ele reduz o dano, não o elimina.
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
  A renovação só acontece por ação de alguém — nunca sozinha. **Não existe renovação agendada**;
  candidatura antiga que ninguém reabre fica com imagem quebrada por tempo indeterminado, e o
  período de validade de 24h nunca chega a ser avaliado porque nada dispara a avaliação.
  `[CORRIGIDO 2026-08-24]` Este parágrafo dizia que a candidatura era um dos dois pontos de
  disparo. Era pior do que isso: **só a candidatura pública** disparava. Cadastro de creator e
  candidatura autenticada não disparavam nada — ver "Behavior → Quando a sincronização é
  disparada" e Change History.
  **Trocar de provedor não resolve isto:** a API oficial do Instagram também entrega URL de
  mídia temporária. O que resolve é deixar de guardar URL e passar a guardar a imagem (ou
  cachear os bytes no primeiro acesso do proxy) — decisão de arquitetura ainda não tomada,
  passar pelo `/architect`.
- **Fila assíncrona (`D-16`) ainda não existe.** O disparo hoje é fire-and-forget em memória,
  sem retry automático além do cooldown manual. Consequência que continua aberta: uma busca em
  andamento quando o processo reinicia (deploy, por exemplo) some sem deixar rastro, e a creator
  fica com o status "em busca" até que alguém acione a atualização manual.
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

Verificação de existência de @:
- [x] Provedor real: `404` **com o corpo de erro explícito do Instagram** → "não existe";
      `404` sem esse corpo (vazio, não-JSON, ou outra mensagem) → "indeterminado"; `5xx`, tempo
      esgotado e corpo sem identificador de perfil → "indeterminado".
      (`rapidapi.instagram.provider.spec.ts` → `describe('checkHandle')`)
- [x] Provedor real: nenhuma nova tentativa em cadeia na verificação (diferente da busca de
      perfil da sincronização, que tem retentativas) — a pessoa está esperando na tela.
      (`rapidapi.instagram.provider.spec.ts` → "não faz retry — uma tentativa só, mesmo em falha")
- [x] Rota: formato inválido → `400` e o provedor não é chamado (validado por mock, não por
      inspeção). (`ig-handle.controller.spec.ts`)
- [x] Rota: corpo da resposta contém apenas handle + desfecho. (`ig-handle.controller.spec.ts`)
- [x] Rota: segunda verificação do mesmo @ dentro do período não chama o provedor — a garantia é
      do cache do provedor (`ig-profile-cache.ts`), não da rota; testado em
      `rapidapi.instagram.provider.spec.ts` → "verificar o mesmo @ duas vezes seguidas...".
- [x] Rota: teto global atingido → "indeterminado" sem chamada externa. (`ig-handle.controller.spec.ts`
      → `describe('teto global de consultas por minuto')`)
- [x] Reaproveitamento: sincronização logo após verificação chama só o feed. **Validado por
      mutação** — o teste conta as chamadas de `fetch` e comenta explicitamente o total que
      apareceria se o reaproveitamento fosse removido (4, não 2).
      (`rapidapi.instagram.provider.spec.ts` → `describe('reaproveitamento entre checkHandle e
      fetchProfile')`)
- [x] Reaproveitamento: `force` (atualização manual) ignora o cache. (idem, "atualização manual
      (force) ignora o reaproveitamento...")
- [x] Reaproveitamento: entrada expirada não é usada. (`ig-profile-cache.spec.ts` e
      `rapidapi.instagram.provider.spec.ts` → "entrada expirada do cache não é reaproveitada")
- [x] Cache não cresce sem limite com handles distintos (teto de entradas). (`ig-profile-cache.spec.ts`)
- [x] Provedor de desenvolvimento produz os três desfechos de forma determinística.
      (`stub.instagram.provider.spec.ts`)
- [x] Frontend: `PublicApplyPage` e `RegisterInfluencerPage` — ver as specs
      `creator-discovery-and-apply` e `creator-account`.

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
- Verificação de handle: `InstagramProvider` ganha `checkHandle(handle)` devolvendo
  `'FOUND' | 'NOT_FOUND' | 'UNKNOWN'` (só o passo de perfil, **sem** feed e **sem** retentativas),
  e `fetchProfile(handle, { allowCached })` passa a aceitar a opção de reaproveitamento (default
  `true`; `InstagramSyncService.refresh` repassa `allowCached: !force`). `IgProfileCache` (mapa em
  memória, TTL curto + teto de entradas via poda FIFO na escrita) fica entre o provedor RapidAPI e
  o passo de perfil, guardando tanto o perfil bruto quanto o veredito `NOT_FOUND`. Novo controller
  `IgHandleController` (`GET ig/handle/:handle`) com `@Throttle` próprio (10/60s por IP, mais
  restrito que o padrão global de 60/60s) — o handle é normalizado e validado por regex **dentro
  do próprio controller** (mesmo alfabeto do `PublicApplyDto`, mas sem DTO — é um param de rota,
  não um body), o que garante o `400` antes de qualquer chamada externa. Teto global por minuto
  também vive no controller, como contador simples de janela deslizante (campo de instância, sem
  Redis — degrada por processo, ver Known Gaps). Variáveis novas: `IG_HANDLE_CHECK_TIMEOUT_MS`
  (default 5000, menor que o da sincronização porque tem gente esperando na tela),
  `IG_PROFILE_CACHE_TTL_MINUTES` (default 15), `IG_HANDLE_CHECK_BUDGET_PER_MINUTE` (default 60).
  Nenhuma delas é lida em request com `getOrThrow` — todas têm default, então não entram em
  `REQUIRED_ENV_IN_PRODUCTION`. `StubInstagramProvider` decide o desfecho por substring reservada
  no próprio handle (`STUB_HANDLE_NOT_FOUND_MARKER`/`STUB_HANDLE_UNKNOWN_MARKER`), mantendo o
  determinismo que já tinha; espelha a falha real também em `fetchProfile` (handle marcado como
  inexistente rejeita, igual ao provedor real com cache `not_found`).
- `calcEngagementRate(posts, followers)`: soma `likes + comments` de todos os posts, divide
  pelo NÚMERO DE POSTS (média por post), divide por `followers`, multiplica por 100 e arredonda
  a 1 casa decimal. Função pura. `null` quando não há posts ou `followers = 0`.
  (Até 2026-08-23 esta linha dizia `(likes+comments)/followers × 100`, omitindo a média por
  post — a fórmula descrita dava o dobro do valor real.)

## Change History
- 2026-08-29 · **fix de falso negativo na verificação de @.** A checagem em produção com tráfego
  real (que a entrada de 2026-08-27 dizia faltar) revelou que a RapidAPI responde `404` para
  contas reais que ela não consegue ler — `ramondinopro`, ~7M seguidores, verificada, era
  bloqueada. `RapidApiInstagramProvider.checkHandle` passou a exigir o corpo de erro explícito
  do Instagram para afirmar `NOT_FOUND`; `404` sem esse corpo → `UNKNOWN` (libera o envio).
  Frontend: o hint "Perfil encontrado no Instagram" agora aparece em verde (`KineticField`
  ganhou `hintTone`). Ver `decisions.md` `D-19`.
- 2026-08-27 · **implementada** a verificação de existência de um @ desenhada em 2026-08-26 (ver
  entrada abaixo pro desenho). `GET /ig/handle/:handle`, `IgProfileCache`, `checkHandle` nos dois
  providers, `InstagramSyncService.refresh` repassando `allowCached: !force`. Mapeamento
  `404 → NOT_FOUND` **confirmado contra a API real** via `curl` antes do merge (ver `decisions.md`
  `D-19`, agora `FIRME`) — achado no processo: um handle de teste com 38 caracteres (acima do
  limite de 30 do Instagram) devolveu `400`, não `404`; teria sido um sinal falso se aceito sem
  reteste com um handle de tamanho válido. Todos os critérios novos das seções anteriores viraram
  `- [x]`.
- 2026-08-26 · `/architect` acrescentou a **verificação de existência de um @** a esta capacidade
  (pedido do Pedro, registrado em `decisions.md` na entrada de 2026-08-26 e na correção logo
  abaixo dela). Três decisões que moldam o desenho: (1) o desfecho "não existe" só é afirmado com
  resposta conclusiva do provedor — qualquer ambiguidade vira "indeterminado", porque barrar
  creator legítima por instabilidade de terceiro é o erro caro; (2) a consulta de perfil da
  verificação é **reaproveitada** pela sincronização que vem logo depois, então o custo de cota
  por creator nova continua o mesmo de hoje (um perfil + um feed); (3) sendo rota pública sobre
  API paga, ganha limite por origem **e** teto global por minuto, com o teto degradando para
  "indeterminado" em vez de erro.
- 2026-08-24 · **corrigido o furo estrutural de disparo.** Só a candidatura pública sincronizava;
  cadastro de creator e candidatura autenticada não disparavam nada. Como `igFetchStatus` é
  anulável e a interface lê ausência como falha, toda creator que entrava pelo cadastro aparecia
  para a marca como "Dados do Instagram indisponíveis" desde o primeiro segundo — sem nunca ter
  havido uma tentativa. Sintoma relatado: "tem hora que vem de primeira e tem hora que não" —
  dependia de por qual porta a creator tinha entrado, não de instabilidade da API externa (a
  RapidAPI foi verificada sã no mesmo dia: perfil e feed respondendo 200). O disparo virou
  `InstagramSyncService.scheduleRefresh`, método público deste serviço, e os três caminhos
  passam a chamá-lo — antes era um helper privado do `CreatorsService`, o que é justamente o que
  permitiu que dois caminhos esquecessem dele.
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
