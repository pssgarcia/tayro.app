---
slug: email-notifications
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-09-09
implements:
  - apps/api/src/modules/email/email.service.ts
  - apps/api/src/modules/email/email.module.ts
  - apps/api/src/modules/email/providers/stub.email.provider.ts
  - apps/api/src/modules/email/providers/resend.email.provider.ts
  - apps/api/src/modules/applications/application/applications.service.ts
  - apps/api/src/modules/creators/application/creators.service.ts
related_decisions: [D-13]
related_roadmap: ["AGORA #0"]
---

# Notificações por e-mail

## Objective
Retrofit — sem processo `/feature` original registrado. `CLAUDE.md` → "Feito" registra:
e-mail de decisão de candidatura (aprovação/recusa) e e-mail de definição de senha de conta
recém-criada, mesmo padrão de abstração de provedor já usado por `instagram-sync`. Sem isto,
uma creator aprovada/recusada ou com conta recém-criada nunca saberia — dependeria de checar a
plataforma por conta própria.

## Scope
Envio de e-mail transacional disparado por outras capacidades (decisão de candidatura, criação
de conta), incluindo a garantia de que uma falha de envio não derruba a ação que o disparou.

## Out of Scope
- Reenvio manual de link perdido — não existe endpoint; só reemite automaticamente se a pessoa
  se candidatar de novo (ver `account-claim`, `creator-discovery-and-apply`).
- Sistema de template de e-mail (hoje é HTML inline simples) — não é o foco desta capacidade.

## Domain
Sem modelo próprio, sem persistência de e-mails enviados — é um efeito colateral disparado por
outras capacidades. A fonte de envio é um provedor plugável (mesmo padrão de `instagram-sync`):
um stub que não envia de verdade (dev/teste) ou uma integração real.

## Behavior

### Gatilhos (lista incompleta — ver Known Gaps sobre deriva de spec)
| Evento | Conteúdo | Destinatário |
|---|---|---|
| Candidatura aprovada | Nome da creator, marca, campanha — direciona pra plataforma pros próximos passos | Creator |
| Candidatura recusada | Mesmo formato, tom neutro | Creator |
| Conta criada (claim pendente) | Link de definição de senha, aviso de expiração em 7 dias | Creator |
| **Conta de creator criada via candidatura pública** (2026-09-09) | Nome, e-mail e @ do Instagram da conta nova | **Operador** (`ADMIN_NOTIFICATION_EMAIL`), não a creator — instrumentação do funil, não notificação de produto (ver Behavior abaixo) |

### Regra de negócio: sempre best-effort
Uma falha ao enviar e-mail **nunca** deve impedir ou reverter a ação de negócio que o
originou — aprovação, recusa e criação de conta continuam válidas mesmo que o envio falhe. Uma
falha de envio só é registrada em log; nunca é propagada como erro pra quem chamou.

### Notificação do operador (não é notificação de produto)
A notificação de conta nova (linha acima) é diferente de categoria das outras: não é um efeito
que o PRODUTO deve ao usuário, é instrumentação que o OPERADOR (Pedro) pediu pra si mesmo, pra
acompanhar o funil do item #0 do `roadmap.md` (rodar com uma marca real) sem consultar o banco na
mão — mesma classe de justificativa do Sentry (`D-20`), avaliada e admitida no `/feature` em
2026-09-09 apesar de falhar o critério 1 da regra de admissão do roadmap ("tira trabalho manual
da marca OU engorda o registro da creator") justamente por não ser feature de produto.

Consequência de desenho: `ADMIN_NOTIFICATION_EMAIL` é **opcional**, ao contrário de
`FRONTEND_URL`/`JWT_*` (`shared/config/required-env.ts`). Sem ela configurada, a notificação
simplesmente não dispara — não é falha, é "instrumentação desligada", e por isso é lida com
`config.get`, nunca `getOrThrow`, e não faz parte do fail-fast de boot em produção.

Dispara só quando `CreatorsService.findOrCreateInfluencer` CRIA de fato um `User`+`Influencer`
novo — nunca nas reaplicações (handle ou e-mail já existentes, ver `creator-discovery-and-apply`).
Escopo deliberadamente menor que "toda conta nova do produto": cadastro de marca
(`AuthService.registerBrand`) e cadastro direto de creator (`AuthService.registerInfluencer`)
ficam de fora por ora — ver Known Gaps.

## API / Interfaces
Nenhum endpoint próprio — consumido internamente por `applications-pipeline` (decisão de
candidatura) e por `account-claim`/`creator-discovery-and-apply` (claim). Não há rota HTTP.

## Acceptance Criteria
- [x] Aprovar uma candidatura tenta enviar um e-mail de aprovação.
- [x] Recusar uma candidatura tenta enviar um e-mail de recusa.
- [x] Criar uma conta nova (via candidatura pública) tenta enviar um e-mail com link de
      definição de senha.
- [x] O provedor de envio falhando não impede nem reverte a aprovação/recusa/criação de conta
      que o originou.
- [ ] Existe teste, no nível de `ApplicationsService` (não só de `EmailService` isolado), que
      confirma que um provedor lançando exceção não impede o `approve`/`reject` — ver Known Gaps.
- [x] Criar uma conta de creator nova via candidatura pública, com `ADMIN_NOTIFICATION_EMAIL`
      configurada, tenta notificar o operador.
- [x] Sem `ADMIN_NOTIFICATION_EMAIL` configurada, nenhuma tentativa de notificação acontece
      (não é erro, é ausência de configuração).
- [x] Reaplicação (handle ou e-mail já existente) NUNCA notifica — só criação de fato.
- [x] Falha ao notificar o operador não impede a candidatura que a originou.

## Error Scenarios
- Provedor de envio indisponível ou lançando erro → ação de negócio original é concluída
  normalmente; falha é só registrada em log.

## Known Gaps
- **`EMAIL_PROVIDER` em produção hoje é o stub, não o provedor real** (`D-13`, `TEMPORÁRIA`) —
  a integração real só entrega para o próprio e-mail da conta usada em teste; domínio real
  ainda não comprado. **Consequência que não pode ser esquecida:** nenhum e-mail chega pra
  usuário real hoje — aprovação, recusa e claim inclusive. Qualquer capacidade nova que dependa
  de e-mail chegar de fato está "pronta mas inerte" em produção até `D-13` mudar.
- **O comportamento best-effort não tem confirmação no nível de `ApplicationsService`.** É
  testado no nível de `EmailService` (provedor lançando exceção não propaga), mas não há teste
  que injete um provedor falho dentro do fluxo de `approve()`/`reject()` e confirme que a
  aprovação/recusa mesmo assim se completa.
- **Tabela de gatilhos e "Current Implementation" ficaram atrás do código antes desta edição.**
  `sendPasswordReset`, `sendPartnershipResult`, `sendEmailChanged` e `sendAccountDeleted` existem
  em `email.service.ts` e não estavam documentados aqui — retrofit completo não fez parte desta
  mudança (que só adicionou a notificação de conta nova); fica como dívida separada.
- **Notificação de conta nova cobre só a candidatura pública, não os 3 caminhos de criação de
  conta.** `AuthService.registerBrand` e `AuthService.registerInfluencer` (cadastro direto) não
  disparam a notificação — decisão deliberada de menor escopo (roadmap.md, nota do item AGORA
  #0), não esquecimento. Estender é replicar o mesmo padrão
  (`config.get('ADMIN_NOTIFICATION_EMAIL')` + `sendNewAccountNotification`) nos dois métodos, se
  se mostrar útil.

## Test Coverage
- `apps/api/src/modules/email/email.service.spec.ts` — [x] comportamento best-effort no nível
  do serviço de e-mail; [x] `sendNewAccountNotification` (conteúdo + omissão do `detail` quando
  ausente).
- `apps/api/src/modules/email/providers/resend.email.provider.spec.ts` — [x] integração real.
- `apps/api/src/modules/creators/application/creators.service.new-account-notification.spec.ts` —
  [x] dispara só na criação de fato (não em reapply); [x] respeita ausência de
  `ADMIN_NOTIFICATION_EMAIL`; [x] falha na notificação não derruba a candidatura.
- [ ] Confirmação do best-effort no nível de `ApplicationsService` — não existe (ver Known Gaps).

## Current Implementation
- `EmailProvider` (interface `send({ to, subject, html })`) + token de injeção
  `EMAIL_PROVIDER`, resolvido em `EmailModule` por variável de ambiente
  (`EMAIL_PROVIDER=stub|resend`, default `stub`).
- `StubEmailProvider` não envia de verdade — loga destinatário/assunto e extrai qualquer link
  presente no HTML via regex, logando-o também. É a única forma de pegar um link de claim em
  dev sem configurar o provedor real.
- `EmailService.sendBestEffort` envolve toda chamada ao provedor em try/catch; falha vira
  `logger.warn`, nunca exceção propagada.
- Métodos: `sendApplicationApproved`, `sendApplicationRejected` (chamados de
  `ApplicationsService.approve()`/`.reject()`), `sendClaimAccount` (chamado de
  `CreatorsService`, ver `account-claim`). Lista incompleta — ver Known Gaps.
- `EmailService.sendNewAccountNotification({ to, role, name, email, detail? })` — genérico o
  bastante pra cobrir `BRAND`/`INFLUENCER` de propósito, mesmo só um chamador existir hoje.
  `CreatorsService.notifyAdminOfNewCreatorAccount` (privado) resolve `ADMIN_NOTIFICATION_EMAIL`
  via `config.get`, decide SE dispara e é o único lugar que sabe qual variável de ambiente usar —
  `EmailService` só monta e manda pro `to` que recebeu, sem acoplar a "quem é o admin".

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0+.
- 2026-08-21 · reestruturado pro padrão SDD (Objective/Scope/Domain/Behavior/API/Acceptance
  Criteria/Error Scenarios/Known Gaps/Test Coverage/Current Implementation). Sem UI Behavior —
  capacidade sem frontend próprio.

## Change History (complemento)
- 2026-09-04 · **minimização de dado pessoal em log.** `EmailService.sendBestEffort` logava o
  endereço de destino INTEIRO no caminho de falha, e log de aplicação fica retido no Railway,
  acessível a quem tem o painel. Agora o destinatário sai mascarado (`maskEmail`, em
  `shared/utils/mask-email.ts`: `an***@gmail.com`) e o ASSUNTO entra na mensagem, que é o que
  identifica qual envio falhou. O domínio é preservado de propósito: é ele que diz se o problema é
  do provedor de destino, e não identifica a pessoa por si só. Mesmo tratamento nos dois `warn` de
  `CreatorsService` (link de claim) e no `StubEmailProvider` (cujo default do `.env.example` é
  `stub`, então um deploy sem `EMAIL_PROVIDER` cairia ali logando endereços reais). O LINK
  continua sendo logado inteiro pelo stub: é a única forma de testar claim e reset em dev.
- 2026-09-09 · **notificação do operador em conta de creator nova** (`/feature`, instrumentação
  do item #0 do `roadmap.md`, não feature de produto). `EmailService.sendNewAccountNotification`
  novo + `CreatorsService.notifyAdminOfNewCreatorAccount` (privado), disparado só na criação de
  fato dentro de `findOrCreateInfluencer`. `ADMIN_NOTIFICATION_EMAIL` opcional, lida com
  `config.get` (nunca `getOrThrow`) — ausência é "desligado", não falha. Cadastro de marca e
  cadastro direto de creator ficam fora por ora (ver Known Gaps).
