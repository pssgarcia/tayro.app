---
slug: email-notifications
status: ACTIVE
origin: RETROFIT
source_of_truth: production_code
last_updated: 2026-08-21
implements:
  - apps/api/src/modules/email/email.service.ts
  - apps/api/src/modules/email/email.module.ts
  - apps/api/src/modules/email/providers/stub.email.provider.ts
  - apps/api/src/modules/email/providers/resend.email.provider.ts
  - apps/api/src/modules/applications/application/applications.service.ts
  - apps/api/src/modules/creators/application/creators.service.ts
related_decisions: [D-13]
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

### Três e-mails, três gatilhos
| Evento | Conteúdo |
|---|---|
| Candidatura aprovada | Nome da creator, marca, campanha — direciona pra plataforma pros próximos passos |
| Candidatura recusada | Mesmo formato, tom neutro |
| Conta criada (claim pendente) | Link de definição de senha, aviso de expiração em 7 dias |

### Regra de negócio: sempre best-effort
Uma falha ao enviar e-mail **nunca** deve impedir ou reverter a ação de negócio que o
originou — aprovação, recusa e criação de conta continuam válidas mesmo que o envio falhe. Uma
falha de envio só é registrada em log; nunca é propagada como erro pra quem chamou.

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

## Test Coverage
- `apps/api/src/modules/email/email.service.spec.ts` — [x] comportamento best-effort no nível
  do serviço de e-mail.
- `apps/api/src/modules/email/providers/resend.email.provider.spec.ts` — [x] integração real.
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
  `CreatorsService`, ver `account-claim`).

## Change History
- 2026-08-21 · retrofit inicial a partir do código em produção v0.36.0+.
- 2026-08-21 · reestruturado pro padrão SDD (Objective/Scope/Domain/Behavior/API/Acceptance
  Criteria/Error Scenarios/Known Gaps/Test Coverage/Current Implementation). Sem UI Behavior —
  capacidade sem frontend próprio.
