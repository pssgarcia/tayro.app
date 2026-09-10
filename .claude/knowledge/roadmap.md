# Roadmap — TAYRO

> Atualizado: 2026-08-23 · Dono: agente `product` · Revisar a cada release.
> Ordenado por **valor de aprendizado**, não por facilidade. Não é lista de desejos:
> item que entra aqui empurra outro pra baixo.

## Onde estamos (2026-08-23)

- **v0.43.0** em produção (`#129`, 2026-08-22) — 43 releases
- CI/CD verde e **sem falso-negativo crônico** desde a v0.43.0 (o CD travava no `railway up --ci`;
  agora é `--detach` + poll, com teste próprio do step)
- 177 testes API · 238 web
- 13 capacidades de domínio com spec viva em `specs/` (SDD desde a v0.42.0)
- **Marcas pagantes: 0 · Usuários reais: 0 · Entrevistas: 0**

Diagnóstico honesto, **inalterado desde 2026-08-06**: a engenharia está muito à frente da
validação. Em 17 dias saíram 11 releases e o número de entrevistas continua zero. O gargalo
nunca foi código — e cada release nova aumenta a distância, não diminui.

---

## AGORA — o que destrava tudo

### 0. Ligar o e-mail e rodar o funil com UMA marca real 🔴 não é feature
`[Veredito do /feature, 2026-08-23 — ver D-17]` O ciclo de candidatura espontânea está
**construído e cortado em produção**: com `EMAIL_PROVIDER=stub`, a creator se candidata, a conta
CLAIMABLE é criada e o link de acesso **nunca chega**; a marca aprova e ela **nunca fica sabendo**.
"Conectar creator e marca" não é trabalho de código pendente — é um domínio de ~R$40/ano.

O experimento, inteiro: (1) comprar domínio + ligar Resend (~30min); (2) uma marca real da rede
da Thais publica **um** programa; (3) ela posta o link `/apply/:id` no story; (4) observar por
2 semanas, sem tocar em código.

Mede o que 43 releases não mediram: quantas creators se candidatam · **quantas completam o
claim** (é o teste do risco da P2 em `personas.md`: "pode simplesmente não querer mais uma
plataforma") · quanto tempo a marca leva por decisão · quantas voltam depois.
> Custo: zero release. É o item de maior aprendizado por real gasto de toda esta lista.

**Instrumentação admitida em 2026-09-09 (`/feature`), não é entrada nova do roadmap:**
notificação por e-mail pro Pedro a cada conta nova criada (mesma classe do Sentry/`D-20` —
observabilidade do operador, não feature de produto; falha no critério 1 da regra de admissão
de propósito). Serve só pra dar visibilidade em tempo real a ESTE experimento, sem precisar
consultar o banco na mão. Menor escopo: só no ponto de criação de conta via candidatura pública
(`CreatorsService.findOrCreateInfluencer`, só quando cria de fato, não em reaplicação); estender
pra `registerBrand`/`registerInfluencer` depois, se útil.

### 1. Cinco entrevistas com marca (P1) 🔴 não é código
Destrava `D-A` (monetização), `D-B` (marca vs agência) e o posicionamento inteiro.
Enquanto isso não acontece, **toda priorização abaixo é chute** — inclusive esta.
Roteiro pronto em `customer-interviews.md`. Custo: ~5 conversas de 30min.
> Cofundador falando: se você só fizer um item deste roadmap neste mês, faz esse.
> É o único que muda o que todos os outros deveriam ser.

### 2. Fechar o diferencial nº 2/nº 3 — registro de resultado de parceria — `ENTREGUE em 2026-09-03`
Era o item que dizia: `PartnershipResult` existe no banco e **nada escreve nele**
`[FATO — verificado 2026-08-06]`; sem isso, "histórico verificado" e "transparência bilateral"
eram slide, não produto — metade do que a gente diz que é.
**`D-D` foi decidida pelo Pedro em 2026-09-03** (registrada como `D-21`) e a capacidade foi
implementada no mesmo dia: a marca informa o resultado numa aba própria do detalhe da campanha,
a creator **sempre** vê no Registro dela (e é avisada por e-mail), e a vitrine pública de
`/c/:handle` exige os dois consentimentos. A contagem de "parcerias concluídas" ganhou regra
pública dita na própria página, e os números aparecem sempre atribuídos à marca que os informou
— o tayro não mede nada disso. Ver `specs/partnership-results` e `CLAUDE.md` → Feito.
> **O que isto NÃO mediu:** nenhuma marca real usou. O aprendizado desta entrega só começa com
> o item #0 rodando — se marca nenhuma informar resultado espontaneamente, o problema é de
> incentivo, não de tela (gatilho de revisão da `D-21`).
Sai do AGORA na próxima revisão deste arquivo.

### 3. E-mail real em produção
`EMAIL_PROVIDER=stub` significa que **nenhum e-mail chega pra ninguém** hoje: aprovação, recusa,
link de claim. Uma creator real que se candidatar nunca recebe nada.
É gate de lançamento, não feature. Depende de comprar o domínio (`D-13`).
**Destrava também o item 3.1 abaixo** — sem e-mail, "esqueci a senha" não tem como existir.

### 3.1 Trocar e recuperar senha 🔴 gate de lançamento
`[FATO — verificado 2026-08-23]` O controller `auth` expõe `register/brand`,
`register/influencer`, `claim`, `claim/:token`, `login`, `refresh`, `logout` — e nada mais.
Não existe troca de senha logada nem recuperação. `POST /auth/claim` define a senha **uma vez**;
quem esquece (ou tem a senha vazada) fica fora do produto para sempre, sem caminho de volta.
É **segurança antes de LGPD** e o item de código mais urgente da lista. O botão "Esqueci" já foi
removido do Login (v0.37.0) justamente por não ter para onde levar.

### 4. Navegar campanhas sem login — `ENTREGUE em produção na v0.34.0 (#96)`
Ataca o risco não testado da P2 em `personas.md` ("pode simplesmente não querer mais uma
plataforma"). Desenho em `/architect` 2026-08-10: em vez de reconstruir uma tela de detalhe
pública, `/apply/:id` **já fazia esse papel** (oferta completa + form, cria conta ao
candidatar) — só faltava ser encontrável. Escopo final: `/programs` (vitrine pública, sem
guard) linkando pro que já existia; `GET /campaigns` ganhou `OptionalJwtAuthGuard` (mesmo
padrão de `:id`) só pra logar `anonymous=true|false` — o contador cru que era condição de
admissão. Nenhuma tela de detalhe pública nova, nenhuma mudança no fluxo de candidatura.
Detalhe em `CLAUDE.md` → Feito, v0.34.0. **Em produção desde então** — sai do AGORA na próxima
revisão deste arquivo; fica aqui só como registro do desenho. O contador `anonymous=true|false`
que foi condição de admissão está gravando em log e **nunca foi lido por ninguém** — ler esse
número é trabalho de 10 minutos e é a única evidência de funil que o produto tem.

---

## PRÓXIMO — antes do lançamento

### Paridade mobile da Fila — ver aprovadas/recusadas no celular `[ENTREGUE em 2026-08-27 — sai do PRÓXIMO na próxima revisão]`
`[FATO — verificado 2026-08-27]` A Fila **desktop** (`CampaignFilaTab`) lista toda candidatura de
qualquer status; a Fila **mobile** (`CampaignPipelineMobileStory`) filtra `status === 'PENDING'`
e **não tem superfície nenhuma** pra ver quem já foi aprovado ou recusado. Como o produto é
mobile-first (`D-10`), a marca que opera do celular — o dispositivo assumido como primário —
fica sem enxergar o próprio elenco da campanha. É a dor nº 2 da Marina (`personas.md`:
"perde o fio de quem já está dentro"), e no mobile ela hoje não tem resposta alguma.
**Escopo mínimo:** um filtro/aba de status na revisão mobile (ou uma lista simples fora do modo
Story), reaproveitando a query e as mutations que já vivem em `CampaignFilaTab`. Não é tela nova
nem roster cross-campanha — é paridade com o que o desktop já faz.
**Ratificado pelo Pedro em 2026-08-27** e puxado pra implementação imediata (branch
`feature/fila-mobile-paridade-status`) apesar de não haver marca real — o argumento que venceu o
"não é AGORA" é `D-10`: um produto mobile-first que esconde metade do dado no celular é buraco,
não backlog. Cadastro manual de creator pela marca foi avaliado junto e **rejeitado** (contradiz
`vision.md` nº 3, adiciona trabalho manual, adjacente a `D-B`); ver `decisions.md` → propostas
rejeitadas, 2026-08-27.

### LGPD — levantamento 2026-08-14 (Pedro: "importante, mas não agora")

Auditoria dos direitos que a lei nomeia contra o que o código faz hoje. **Não é opinião jurídica**
— é mapeamento de engenharia; quem diz se está conforme é advogado.

**O que já está certo** (não refazer): `publicProfileEnabled` é opt-in com default `false` e
revogável a qualquer momento — revogação de consentimento (art. 18 IX) bem feita. Correção de
perfil existe (`PATCH /influencers/me`). 404 uniforme pra perfil privado é anti-enumeração
deliberado.

**Bloco 1 — só código, sem decisão pendente. Dá pra fazer a qualquer momento:**

| Item | Por que importa |
|---|---|
| **Trocar senha logada** | O mais urgente dos três, e é **segurança antes de LGPD**: hoje, se a senha de alguém vazar, a pessoa não tem como trocá-la. Não existe endpoint |
| **Trocar e-mail** | `email` não está em nenhum DTO de update. Correção (art. 18 III) do dado mais identificador é impossível pelo produto |
| **Exportar dados** | Acesso e portabilidade (art. 18 II e V). Não existe |

**Bloco 2 — depende de você, não de código:**

- **Política de privacidade + termos** — `[FATO — verificado 2026-08-14]` **zero** ocorrências de
  "privacidade", "termos" ou "LGPD" em todo o frontend. É art. 9 (finalidade, duração,
  compartilhamento) e hoje não há base legal documentada pra nada. Precisa de texto que o Pedro
  escreva ou valide — agente não inventa texto jurídico e publica.
- **Captura de consentimento** — nenhum aceite nos três fluxos de entrada (`RegisterBrandPage`,
  `RegisterInfluencerPage`, `PublicApplyPage`). Sem registro de manifestação nem timestamp. O
  ponto mais sensível é o `/apply/:id`: a pessoa entrega e-mail e handle **antes de ter conta**.
- **Exclusão de conta** — **bloqueado por `D-E`** (apagar vs. anonimizar). Não começar sem decisão.

**Bloco 3 — transparência sobre dado de terceiro:**

- `followersCount`, `igProfilePicUrl` e `igRecentPosts` (URLs, thumbnails, likes, comentários) são
  buscados via RapidAPI e ficam **cacheados no banco por tempo indeterminado**. A creator nunca é
  informada de que o handle dela é enviado a um terceiro, nem por quanto tempo o dado fica. Art. 9
  (informação sobre compartilhamento). Resolve-se junto com a política de privacidade — mas é
  conteúdo separado, não parágrafo genérico.
- **Sentry (região EU) é o 2º sub-processador de dado pessoal** desde `D-20` — recebe stack trace,
  breadcrumbs e contexto de request de erros em produção. Já mitigado no código (`sendDefaultPii:
  false` — sem IP; corpo de `/auth/*` e headers de auth removidos no `beforeSend`; Session Replay
  desligado). Precisa aparecer nominalmente na política de privacidade e no texto de consentimento
  dos 3 fluxos de entrada, junto com a RapidAPI.

Ordem sugerida: trocar senha → política + consentimento (quando houver texto) → e-mail → export →
exclusão (depois de `D-E`).

---

- **Checklist de lançamento** (`prelaunch`): HTTPS · env vars revisadas · política de privacidade
  e termos (ver bloco LGPD acima) · backup do banco · auditoria de segurança e arquitetura
  **via Fable** (`D-15`)
- **Monitoramento de erros (Sentry)** — `[EM ANDAMENTO — `D-20`, 2026-08-27]` puxado do
  checklist pra agora (custo zero, janela sem dado sensível, aprendizado). Implementado nas
  branches `feature/observabilidade-sentry-{api,web}`, inerte até as env vars serem setadas,
  aguardando ratificação do Pedro. Escopo: erro não tratado + tracing 10%, sem Session Replay.
  Falta: setar `SENTRY_DSN`/`VITE_SENTRY_DSN` (região EU) no Railway/Vercel + o auth token de
  build no Vercel, e o smoke test em produção (rota de erro temporária → conferir evento com
  stack legível e tags `environment`/`release`)
- **Imagem do IG expira depois de um tempo** — `[FATO — verificado 2026-08-23]` rediagnosticado:
  o registro anterior ("IG incompleto na 1ª candidatura") estava errado. Os dados chegam certos
  na candidatura; o que quebra é a imagem com o tempo, porque guardamos a **URL assinada** da
  CDN em vez da imagem, e nada renova essa URL depois (não existe refresh agendado — só o apply
  e o botão manual). Efeito: perfil de creator antiga fica sem foto e com o feed furado.
  **Migrar pra API oficial do Instagram não corrige isso** — a API oficial também devolve URL de
  mídia temporária; a correção é guardar/cachear a imagem. A API oficial tem outros méritos
  (ToS, consentimento explícito da creator — que é exatamente o Bloco 3 do LGPD acima — e acesso
  a métricas reais de alcance, que alimentariam o item 2 do AGORA): merece `/feature` próprio,
  mas não como conserto de bug. Detalhe em `specs/instagram-sync/spec.md` → Known Gaps

---

## DEPOIS — precisa de tração ou de decisão aberta

- **Fila assíncrona de Instagram (BullMQ + Redis)** — `D-16`. Justificado por confiabilidade **e**
  por aprendizado explícito (filas, observabilidade). Não antes de haver volume que justifique
- **Instagram conectado e verificado (OAuth)** — `[Future] Instagram OAuth / Connected Social
  Account`, registrado em `D-23` (2026-09-04). Só backlog: nenhuma pesquisa técnica feita, nenhum
  `/architect` rodou. Resolveria dois problemas reais (prova de titularidade da conta, hoje
  inexistente; e dependência de um provedor não oficial via RapidAPI, com o footgun de URL de
  CDN que expira). **Não muda o fluxo de candidatura** — conexão é sempre posterior e opcional,
  dentro da conta já criada, protegendo a `Regra 10` de `creator-discovery-and-apply` e `D-17`.
  Puxar pra `/feature` quando houver marca real pedindo verificação, ou quando o footgun de
  imagem expirada continuar incomodando mesmo depois do cache de bytes (`D-18`). Ver `D-23` pra
  objetivos, decisões de produto, direção de modelo de dados e a lista de pesquisa técnica
  necessária antes de desenhar (APIs oficiais disponíveis, escopos, fluxo OAuth, expiração de
  token, requisitos de app review).
- **Reenvio manual de link de claim** (`D-14`) — no dia em que a primeira creator real travar
- **Capacitor / app de loja** (`D-11`) — só com tração
- **Multi-cliente / agência** — **bloqueado por `D-B`**. Não começar sem decisão
- **Billing / planos** — **bloqueado por `D-A`**. Não começar sem decisão

---

## NÃO VAMOS FAZER (e por quê)

| Item | Motivo | Ref |
|---|---|---|
| Calendário | Ninguém pediu; reavaliar após 10 entrevistas | `D-09` |
| Ranking / gamificação / moedas | Não valida o fluxo central | `D-08` |
| Notificação in-app | Idem — o modelo `Notification` é tabela órfã, sem módulo na API | `D-08` |
| Chat em tempo real | WhatsApp já existe e ganha | `D-08` |
| Relatórios avançados | Antes disso é preciso ter dado de resultado (item 2 do AGORA) | `D-08` |
| Pagamento automático / escrow | KYC, custódia, risco regulatório. Não valida a tese | `D-07` |
| React Native | Reescrever UI com app web funcionando é desperdício | `D-11` |
| Discovery de creator | É o jogo do Modash; nosso valor começa depois que a candidata aparece | `vision.md` nº 6 |

---

## Regra de admissão (o agente `product` aplica)

Pra entrar no AGORA, a feature precisa passar em **todas**:

1. Tira trabalho manual da marca **ou** engorda o registro de trabalho da creator
2. Não contradiz nenhum "nunca" da `vision.md`
3. Não depende de decisão `ABERTA` em `decisions.md`
4. Cabe em uma release (`vX.Y.0`) — se não couber, não foi decomposta
5. Dá pra dizer o que a gente aprende com ela, não só o que ela entrega

Falhou em uma? Vai pro DEPOIS com o motivo escrito. Falhou na 2? Sobe pro Pedro e pra Thais.
