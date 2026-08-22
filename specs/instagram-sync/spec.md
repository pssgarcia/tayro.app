---
slug: instagram-sync
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/instagram/instagram-sync.service.ts
  - apps/api/src/modules/instagram/instagram.module.ts
  - apps/api/src/modules/instagram/providers/rapidapi.instagram.provider.ts
  - apps/api/src/modules/instagram/providers/stub.instagram.provider.ts
  - apps/api/src/modules/instagram/ig-avatar.controller.ts
  - apps/api/src/modules/instagram/engagement.utils.ts
  - apps/api/src/modules/applications/application/applications.service.ts
related_decisions: [D-16]
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
recentes, foto de perfil), a política de quando reconsultar, e a exibição da foto de perfil
sem violar a política de origem cruzada do Instagram.

## Out of Scope
- **Fila assíncrona (BullMQ + Redis)** é o alvo declarado (`D-16`, `PROPOSTA`), ainda não
  implementado. Hoje o disparo é fire-and-forget síncrono na prática, sem retry automático além
  do cooldown manual — ver Known Gaps.
- Botão "Atualizar" na interface (onde aparece, quando fica habilitado) — isso é UI de
  `applications-pipeline`/`campaign-fila-review`, que consomem este serviço.

## Domain
Sem modelo próprio — escreve nos campos de Instagram de `Influencer`: `followersCount`,
`igEngagementRate`, `igRecentPosts` (JSON), `igProfilePicUrl`, `igFetchedAt`, `igFetchStatus`
(`PENDING`/`OK`/`FAILED`). A fonte de dado é um provedor plugável (hoje: um stub determinístico
para dev/teste, ou a integração real via RapidAPI).

**Restrição externa que molda o design (não negociável):** o Instagram serve fotos de **perfil**
com uma política de origem que impede exibi-las diretamente num `<img>` de outro domínio —
mesmo sendo uma URL pública e válida. Essa política não se aplica às thumbnails de **feed**
(mesmo provedor, media diferente). Nenhuma configuração do lado do navegador contorna isso; a
única forma de exibir a foto de perfil é servi-la a partir do próprio domínio.

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

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| `GET` | `/ig/avatar/:influencerId` | nenhum (rota pública, sem limite de taxa) | Proxy same-origin da foto de perfil salva no banco. |
| `PATCH` | `/applications/:id/refresh-ig` | `BRAND` + limite de taxa | Força nova busca, sujeito ao intervalo mínimo entre tentativas. Contrato pertence à spec `applications-pipeline`. |

## Acceptance Criteria
- [x] Busca com perfil indisponível falha a sincronização inteira e marca status de falha.
- [x] Busca com feed indisponível ou conta privada preserva o perfil já obtido; feed fica vazio.
- [x] Dentro do período de validade, uma nova busca automática é pulada.
- [x] Uma falha marca o horário da tentativa, mesmo sem sucesso.
- [x] Uma falha nunca apaga dados válidos anteriores (seguidores, posts, foto).
- [x] A foto de perfil é obtida a partir de uma URL persistida no banco, nunca fornecida pelo
      cliente da rota de exibição.
- [x] A rota de exibição da foto só busca hosts numa lista permitida.
- [ ] O núcleo do contrato (staleness, preservação em falha, carimbo em falha) tem teste de
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

## Known Gaps
- **Fila assíncrona (`D-16`) ainda não existe.** O disparo hoje é fire-and-forget síncrono, sem
  retry automático além do cooldown manual. Ligado ao bug conhecido em `CLAUDE.md` → "Bugs
  conhecidos": dados do Instagram às vezes não vêm completos na primeira candidatura, exigindo
  atualização manual.
- **Sem teste de unidade próprio para `InstagramSyncService`.** Staleness, preservação de valor
  em falha e o carimbo de horário mesmo em falha — o núcleo do contrato de cooldown/staleness —
  não têm teste isolado, só são exercitados indiretamente por quem chama o serviço.
- **Sem teste dedicado para o intervalo mínimo entre tentativas manuais** em
  `applications-pipeline` — o único spec daquele módulo que toca concorrência cobre outro
  assunto (corrida de aprovação).

## Test Coverage
- `apps/api/src/modules/instagram/engagement.utils.spec.ts` — [x] cálculo de taxa de
  engajamento, isolado.
- `apps/api/src/modules/instagram/ig-avatar.controller.spec.ts` — [x] proxy, lista de hosts
  permitida, resposta 404.
- `apps/api/src/modules/instagram/providers/rapidapi.instagram.provider.spec.ts` — [x] fluxo de
  2 passos, novas tentativas do perfil, feed best-effort, fallback da foto de perfil.
- [ ] `instagram-sync.service.spec.ts` — não existe.
- [ ] Teste dedicado do intervalo mínimo entre tentativas manuais — não existe.

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
  max-age=86400`) — a URL do Instagram expira em ~2 semanas e o sync a renova antes disso.
- `calcEngagementRate(posts, followers) = (likes+comments)/followers × 100` — função pura.

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0+.
- 2026-08-21 · reestruturado pro padrão SDD. A restrição de origem cruzada do Instagram (antes
  descrita como "footgun" só na seção de implementação) foi promovida a `Domain`/`Behavior` —
  é uma restrição externa que qualquer redesenho futuro do proxy precisa continuar respeitando,
  não um detalhe de código a esquecer.
