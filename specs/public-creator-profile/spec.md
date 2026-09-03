---
slug: public-creator-profile
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/creators/presentation/creators.controller.ts
  - apps/api/src/modules/creators/application/creators.service.ts
  - apps/web/src/pages/public/PublicCreatorProfilePage.tsx
related_decisions: [D-06, D-D]
---

# Perfil público da creator (media kit vivo)

## Objective
Retrofit — sem processo `/feature` original registrado. Fecha uma promessa quebrada: a tela de
perfil da creator já anunciava `tayro.app/c/{handle}` como texto antes de a rota existir. É o
"media kit vivo" que sustenta o diferencial de posicionamento "histórico verificado"
(`vision.md`), ainda que hoje a parte de resultado de parceria esteja praticamente sem uso real
(ver Known Gaps).

## Scope
Leitura pública (sem autenticação) do perfil de uma creator por handle, incluindo identidade,
métricas de Instagram e histórico de parcerias visível.

## Out of Scope
- Registro de resultado de parceria (quem escreve `PartnershipResult`) — não existe hoje, ver
  Known Gaps.
- Edição do próprio perfil pela creator — isso é `creator-account`.

**Endereço público:** o domínio nunca é literal no código. Todo endereço que sai do produto —
o link do perfil da creator e o link de candidatura que a marca divulga — é montado a partir da
origem em que a aplicação está rodando, então vale em desenvolvimento, em preview e em produção,
e continua correto no dia em que um domínio próprio for apontado. `[CORRIGIDO 2026-08-24]` Até
essa data o código montava `https://tayro.app/...`, um domínio **inexistente** (NXDOMAIN):
todo link copiado desde a v0.29.0 estava morto. Nenhum teste pegou porque nenhum teste sai da
máquina — a proteção agora é travar a origem como fonte, não o domínio como valor.

## Domain
Sem modelo próprio — é uma projeção de leitura de `Influencer` + `Application` (`APPROVED`) +
`ContentSubmission` (`APPROVED`) + `PartnershipResult`. Não escreve nada.

## Behavior

### Regra de acesso (segurança — não mover para Current Implementation)
O perfil só é acessível se **duas** condições forem verdadeiras: o handle existe **e** a
creator ativou a visibilidade pública (`publicProfileEnabled`, default `false` — `D-06`).
Quando qualquer uma das duas falha, o sistema responde da mesma forma nos dois casos — o
cliente não consegue distinguir "esse handle não existe" de "esse handle existe mas é privado".
Isso é deliberado (anti-enumeração): revelar a diferença permitiria descobrir handles reais de
creators que preferem não aparecer.

### O que a leitura expõe
Identidade (nome, avatar, bio, nichos, cidade), métricas de Instagram (seguidores, engajamento,
status da busca, posts recentes) e:
- **Parcerias concluídas** — contagem de candidaturas aprovadas que têm pelo menos um conteúdo
  aprovado associado. É uma aproximação calculada a cada leitura, não um status próprio
  armazenado.
- **Resultados de parceria** — só os que a marca marcou explicitamente como visíveis para a
  creator; nunca todos os resultados registrados.
- **Telefone** — sai junto do resto. `publicProfileEnabled` é o consentimento **único** de
  publicar identidade e contato: quem liga o perfil público publica também o telefone, se tiver
  um cadastrado. Um segundo opt-in só pro telefone chegou a ser implementado e foi **removido
  por decisão do Pedro (2026-09-02)**, depois de levantada a ressalva de que o telefone é
  coletado pra marca usar *depois de aprovar uma candidatura* (`creator-roster`) e de que
  `/c/:handle` é página aberta e indexável. Consequência aceita: telefone de creator com perfil
  público fica legível por qualquer visitante e por crawler.

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| `GET` | `/creators/:handle/public` | nenhum (público) | `200` com o shape acima, ou `404` uniforme (handle inexistente OU privado). |

## UI Behavior
Página standalone (sem layout compartilhado). Identidade, cidade, nichos e bio numa área de
destaque única por tela; avatar carregado via proxy same-origin (ver `instagram-sync` pro
motivo). Métricas de Instagram têm 3 estados visuais conforme `igFetchStatus`
(carregando/indisponível/números reais) sem quebrar o resto da página em nenhum deles. Feed
recente só aparece se houver post. Sem ação de atualizar dados do Instagram nesta tela — quem
teria permissão é a marca, autenticada, não o visitante.

CTA final tem duas formas, decididas pelo telefone: com telefone publicado, é **"Falar no
WhatsApp"** (bloco lime + ícone, mesmo elemento da placa de `/brand/creators`) com "Crie sua
campanha no tayro" como saída secundária em texto; sem telefone, é o "Crie sua campanha" de
sempre. Telefone que a heurística de `whatsappLinkFromPhone` não converte cai na segunda forma —
nunca um link quebrado, mesma regra de `creator-roster`.

## Acceptance Criteria
- [x] Telefone da creator com perfil público aparece na resposta e o CTA vira "Falar no
      WhatsApp".
- [x] Creator sem telefone cadastrado devolve `phone: null` e mantém o CTA de sempre.
- [x] Perfil privado é `404` antes de qualquer leitura — nada é exposto, telefone inclusive.
- [x] Handle inexistente retorna `404` com mensagem genérica.
- [x] Handle existente com `publicProfileEnabled=false` retorna `404` com a **mesma** mensagem
      genérica do caso anterior.
- [x] `results[]` nunca inclui um resultado com `visibleToCreator=false`.
- [x] `completedPartnerships` conta só candidaturas aprovadas com conteúdo aprovado associado.
- [x] A leitura completa (perfil + parcerias) usa uma única query — sem uma consulta adicional
      por parceria.
- [ ] O 404 uniforme (inexistente vs. privado) e o filtro de `results[]` têm teste de unidade
      no nível do serviço — hoje só a performance da query está coberta ali (ver Test Coverage).

## Error Scenarios
- Handle inexistente → `404`, mensagem genérica.
- Handle existente, perfil privado → `404`, mesma mensagem genérica.

## Known Gaps
- **Telefone publicado sem consentimento específico.** Quem ligou `publicProfileEnabled` antes
  de 2026-09-02 consentiu com um perfil público que **não** incluía telefone; a partir dessa
  data o mesmo flag passou a publicá-lo, sem novo aviso a essas creators. Decisão consciente do
  Pedro (ver Change History), não esquecimento. Se algum dia houver política de privacidade
  (`roadmap.md` → LGPD), este é um dos pontos a cobrir.
- **`PartnershipResult` não tem escritor.** Nenhum código do repositório cria ou atualiza essa
  tabela — `results[]` na resposta é, hoje, sempre `[]` na prática. "Histórico verificado"
  (diferencial nº2 do produto) não é entregue de fato por esta capacidade sozinha; falta o
  fluxo de registro, e isso está bloqueado por `D-D` (ABERTA em `decisions.md`) — ainda não foi
  decidido o que conta como "verificado" nem quem atesta.
- **OG tags por creator** (preview rico ao compartilhar o link) não existem — é uma SPA sem
  SSR, `index.html` só tem OG estático/genérico. Sem prioridade definida.
- **O 404 uniforme e o filtro `visibleToCreator` não têm teste de unidade no serviço.** A
  cobertura de frontend confirma o comportamento visual (mesma mensagem nos dois casos), mas
  não prova a regra no nível da API com entradas reais.

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.race.spec.ts` →
  `describe('getPublicProfile()')` — [x] uma única query para perfil + parcerias (guarda de
  N+1). [ ] Não cobre o 404 uniforme nem o filtro `visibleToCreator`.
- `apps/web/src/pages/public/PublicCreatorProfilePage.spec.tsx` — cobertura de UI (hook
  mockado): [x] skeleton de carregamento, [x] mensagem idêntica pra inexistente/privado
  (via `isError`), [x] identidade/nichos/bio, [x] link do handle pro Instagram real, [x] os 3
  estados de métrica (`OK`/`FAILED`/`PENDING`) sem quebrar a página, [x] parcerias concluídas
  em destaque, [x] feed condicional, [x] CTA final, [x] avatar via proxy com fallback pra
  iniciais. É cobertura de comportamento de UI com hook mockado — não substitui teste de
  serviço para a regra de acesso em si.

## Current Implementation
- `CreatorsController.getPublicProfile` → `CreatorsService.getPublicProfile(handle)`.
- Handle resolvido em lowercase (`instagramHandle: handle.toLowerCase()`).
- Query única com `include` aninhado (`applications` → `result` + `submissions` filtrado por
  `status: APPROVED`) — sem N+1.
- Avatar carregado via `/api/v1/ig/avatar/:influencerId` (proxy documentado em
  `instagram-sync`), com fallback para iniciais no frontend quando `igProfilePicUrl` e
  `avatarUrl` são nulos.

## Change History
- 2026-09-02 · Telefone passa a aparecer no perfil público e o CTA do rodapé vira "Falar no
  WhatsApp" quando ele existe. Um opt-in separado (`publicPhoneEnabled`) foi implementado e
  então **removido a pedido do Pedro**, que optou por publicar o telefone junto do
  `publicProfileEnabled` depois de a ressalva ser levantada: o telefone é coletado pra marca
  usar depois de aprovar uma candidatura, e `/c/:handle` é aberta e indexável. Decisão dele,
  registrada aqui pra não ser "redescoberta" como esquecimento — ver Known Gaps.
- 2026-08-24 · o endereço público deixou de ser literal e passou a derivar da origem
  (`publicUrl`/`publicUrlLabel` em `utils/format.ts`). Ver "Out of Scope → Endereço público".
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0+.
- 2026-08-21 · reestruturado pro padrão SDD (Objective/Scope/Domain/Behavior/API/UI
  Behavior/Acceptance Criteria/Error Scenarios/Known Gaps/Test Coverage/Current
  Implementation). Sem mudança de comportamento — a regra de acesso, antes descrita junto com
  "o que expõe", foi destacada como requisito de segurança explícito em vez de um parágrafo a
  mais no meio da descrição do endpoint.
