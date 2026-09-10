---
slug: public-creator-profile
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-09-03
implements:
  - apps/api/src/modules/creators/presentation/creators.controller.ts
  - apps/api/src/modules/creators/application/creators.service.ts
  - apps/web/src/pages/public/PublicCreatorProfilePage.tsx
related_decisions: [D-06, D-21]
---

# Perfil público da creator (media kit vivo)

## Objective
Retrofit — sem processo `/feature` original registrado. Fecha uma promessa quebrada: a tela de
perfil da creator já anunciava `tayro.app/c/{handle}` como texto antes de a rota existir. É o
"media kit vivo" que sustenta o diferencial de posicionamento "histórico verificado"
(`vision.md`) — e desde 2026-09-03 sustenta de fato: os resultados de parceria passaram a ter
escritor e a ser renderizados aqui (ver `partnership-results`).

## Scope
Leitura pública (sem autenticação) do perfil de uma creator por handle, incluindo identidade,
métricas de Instagram e histórico de parcerias visível.

## Out of Scope
- Registro de resultado de parceria (quem escreve, corrige e libera `PartnershipResult`, e o
  controle da creator sobre cada item) — ver `partnership-results`. Esta spec cobre só a
  leitura pública.
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
- **Parcerias concluídas** — contagem de candidaturas aprovadas que tenham pelo menos um
  conteúdo aprovado **ou** um resultado informado pela marca. É calculada a cada leitura, não um
  status próprio armazenado. A regra é **dita em texto na própria página** — contagem de
  reputação sem regra pública de cálculo é o que `vision.md` nº 5 proíbe. `[MUDOU 2026-09-03:
  antes só contava conteúdo aprovado; a metade nova é o resultado informado, ver
  partnership-results]`
- **Resultados de parceria** — só os que têm os DOIS consentimentos: a marca liberou a
  publicação **e** a creator não escondeu aquele item. Cada um sai com o nome da marca e o
  título da campanha (número sem autor não é histórico verificável), e sem os flags de
  consentimento, que são controle e não conteúdo. Ver `partnership-results` pro modelo de
  visibilidade completo.
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
- [x] `results[]` nunca inclui resultado sem consentimento da marca nem resultado que a creator
      escondeu.
- [x] `results[]` não expõe os flags de consentimento.
- [x] Todo resultado publicado diz qual marca o informou.
- [x] `completedPartnerships` conta candidatura aprovada com conteúdo aprovado **ou** com
      resultado informado, e conta cada parceria uma única vez.
- [x] A regra de cálculo de `completedPartnerships` aparece em texto na página, e só quando a
      contagem é maior que zero.
- [x] A leitura completa (perfil + parcerias) usa uma única query — sem uma consulta adicional
      por parceria.
- [x] O 404 uniforme (inexistente vs. privado) e o filtro de `results[]` têm teste de unidade
      no nível do serviço. `[FECHADO 2026-09-03]`

## Error Scenarios
- Handle inexistente → `404`, mensagem genérica.
- Handle existente, perfil privado → `404`, mesma mensagem genérica.

## Known Gaps
- **Telefone publicado sem consentimento específico.** Quem ligou `publicProfileEnabled` antes
  de 2026-09-02 consentiu com um perfil público que **não** incluía telefone; a partir dessa
  data o mesmo flag passou a publicá-lo, sem novo aviso a essas creators. Decisão consciente do
  Pedro (ver Change History), não esquecimento. Se algum dia houver política de privacidade
  (`roadmap.md` → LGPD), este é um dos pontos a cobrir.
- **OG tags por creator** (preview rico ao compartilhar o link) não existem — é uma SPA sem
  SSR, `index.html` só tem OG estático/genérico. Sem prioridade definida.
- **Números do histórico não são verificáveis.** São declarados pela marca; a página atribui
  cada número a ela justamente por isso. Ver `partnership-results` → Known Gaps.

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.race.spec.ts` →
  `describe('getPublicProfile()')` — [x] uma única query para perfil + parcerias (guarda de
  N+1); [x] telefone exposto/nulo e perfil privado; [x] filtro dos dois consentimentos, flags
  não expostos, atribuição à marca; [x] as quatro combinações da regra de contagem e a contagem
  incluindo resultado não-público; [x] 404 uniforme entre handle inexistente e perfil privado.
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
- 2026-09-03 · o histórico de parcerias passou a existir de verdade nesta página: `results[]`
  ganhou escritor (`partnership-results`), passou a ser renderizado (nunca era) e o filtro
  virou "marca liberou E creator não escondeu", no lugar do removido `visibleToCreator`. A
  contagem de parcerias concluídas passou a incluir parceria com resultado informado, e a
  regra de cálculo virou texto visível na página. Known Gap de "PartnershipResult sem escritor"
  fechado; o de teste de serviço do 404 uniforme e do filtro, também.
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

## Change History (complemento)
- 2026-09-04 · **o interruptor de perfil público passou a valer para as IMAGENS.** Até aqui
  `GET /ig/avatar/:influencerId` e `GET /ig/post/:influencerId/:position` eram públicos e não
  checavam `publicProfileEnabled`: desligar o perfil público não tirava foto nem thumbnails do
  ar, e qualquer pessoa com o `influencerId` (uma marca que viu a creator uma vez, ou quem ela
  repassasse a URL) mantinha acesso permanente e não autenticado. Agora quem pode ver é decidido
  pelo `IgImageAccessService` — ver `specs/instagram-sync` → "Autorização das imagens".
