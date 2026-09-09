---
slug: legal-acceptance
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-04
implements:
  - apps/api/prisma/schema.prisma (User.acceptedTermsVersion, acceptedPrivacyVersion, acceptedAt, declaredAdultAt)
  - apps/api/src/shared/legal/legal-documents.ts (TERMS_VERSION, PRIVACY_VERSION, legalAcceptanceFields)
  - apps/api/src/shared/legal/legal-acceptance.dto-fields.ts
  - apps/api/src/modules/auth/application/auth.service.ts (registerBrand, registerInfluencer)
  - apps/api/src/modules/creators/application/creators.service.ts (applyPublic, recordLegalAcceptance)
  - apps/web/src/config/legal.ts
  - apps/web/src/components/legal/LegalAcceptanceFields.tsx
  - apps/web/src/components/primitives/kinetic/KineticCheckbox.tsx
  - apps/web/src/pages/influencer/RegisterInfluencerPage.tsx
  - apps/web/src/pages/auth/RegisterBrandPage.tsx
  - apps/web/src/pages/public/PublicApplyPage.tsx
  - apps/web/src/pages/public/TermsOfUsePage.tsx
related_decisions: []
---

# Aceite dos documentos legais e declaração de maioridade

## Objective
Registrar, de forma verificável, que cada pessoa que cria conta no TAYRO aceitou os Termos de
Uso e a Política de Privacidade em vigor, e declarou ter 18 anos ou mais.

Antes disto o produto tinha os dois problemas apontados na auditoria de 2026-09-04: **nenhum
aceite era capturado** (nem checkbox, nem coluna, nem timestamp, e nenhum dos três fluxos de
entrada mencionava ou linkava os documentos), e a Política afirmava que o produto não se destina
a menores de 18 anos **sem nada no código sustentar isso**.

`origin: FEATURE`: nasce de decisão direta do Pedro para viabilizar a publicação dos documentos,
sem passar pelo `/feature` (não é proposta de produto a avaliar, é pré-requisito jurídico).

## Scope
- As duas caixas obrigatórias nos três fluxos que criam conta.
- Persistência do aceite com **versão explícita** de cada documento, mais os horários.
- Exigência no servidor, não só no navegador.
- Links dos dois documentos alcançáveis dos fluxos e dos rodapés.

## Out of Scope
- A redação dos documentos em si. `/terms-of-use` e `/privacy-policy` foram escritos em
  2026-09-04 (v1.0 dos dois); esta spec cobre o mecanismo de aceite, não o conteúdo jurídico.
- Re-aceite dentro do produto de quem já tinha conta antes deste release (essas contas ficam com
  `NULL`, que é o fato correto). Só o caminho da candidatura pública regulariza, porque é o único
  em que a pessoa passa por uma tela com as caixas de novo.
- Verificação de idade de verdade (documento, data de nascimento, terceiro). A declaração é uma
  afirmação da pessoa, e o produto continua sem meio de conferi-la.
- Consentimento granular por finalidade de tratamento.

## Domain
Quatro colunas novas em `User`, todas nullable e sem default (migration
`add_legal_acceptance_to_user`, aditiva):

| Campo | Tipo | Significado |
|---|---|---|
| `acceptedTermsVersion` | `String?` | Versão dos Termos aceita (ex.: `"1.0"`) |
| `acceptedPrivacyVersion` | `String?` | Versão da Política aceita |
| `acceptedAt` | `DateTime?` | Quando o aceite foi registrado |
| `declaredAdultAt` | `DateTime?` | Quando a pessoa declarou 18+ |

`NULL` em todas = conta criada antes de 2026-09-04. Não é bug: essas contas nunca viram uma caixa
para marcar, e preencher retroativamente seria inventar prova.

**O que este aceite significa:** ciência e aceitação dos documentos. **NÃO** é consentimento
(art. 7º I da LGPD) para todo tratamento de dados. As bases legais de cada tratamento estão na
própria Política, e o opt-in de perfil público (`Influencer.publicProfileEnabled`) continua sendo
o consentimento separado que sempre foi.

**Versões em vigor** vivem em `shared/legal/legal-documents.ts` (fonte única). Publicar texto novo
= subir o número lá.

## Behavior

### Regra 1: quem estampa a versão é o servidor
O cliente envia apenas dois booleanos (`acceptedTermsAndPrivacy`, `declaredAdult`). As versões e
os horários são gravados por `legalAcceptanceFields()`. Enviar `acceptedTermsVersion` no corpo é
recusado com `400` pelo `forbidNonWhitelisted` do `ValidationPipe` global.

Motivo: se o front mandasse a versão, uma requisição forjada gravaria "aceitei a v0.1" e o
registro perderia valor como prova.

### Regra 2: sem aceite não existe conta
`@Equals(true)` nos dois campos, nos três DTOs. Campo ausente, `false` ou `"true"` (string) →
`400`. Não é validação de forma, é regra de negócio: nem chamada direta à API cria conta sem
aceite.

### Regra 3: conta e aceite nascem juntos
Nos dois cadastros e no caminho de criação da candidatura pública, os campos entram no mesmo
`user.create`. Não existe janela em que exista conta sem registro de aceite.

### Regra 4: idioma não entra no registro, porque só um texto vincula
Os dois documentos existem em português e em inglês desde 2026-09-09. A versão em inglês é
**tradução de cortesia** da mesma versão (`1.0`) e diz, no topo da página, que a versão em
português é a que prevalece em caso de divergência.

Por isso o registro de aceite **não guarda idioma** e não precisa guardar: qualquer que seja o
idioma lido, o texto aceito é o mesmo documento, na mesma versão. Publicar duas versões com o
mesmo peso exigiria gravar o idioma (senão `acceptedTermsVersion: "1.0"` deixaria de apontar para
um texto identificável) e criaria ambiguidade num contrato de adesão, que se resolve contra quem
redigiu. Decisão do Pedro em 2026-09-09, ao pedir a tradução.

Consequência operacional: **mudança no texto em português vai para o inglês no mesmo commit**. As
asserções de honestidade (não processa pagamento, não verifica identidade, sem integração oficial
com a Meta, sem moderação, sem SLA, a candidatura sem login cria conta, a exclusão não é total,
idade declarada) rodam nos dois idiomas.

### Regra 5: o primeiro aceite de uma versão não é sobrescrito
`recordLegalAcceptance` (candidatura pública em conta que já existia):
- versão guardada **igual** à em vigor → não escreve nada. O que vale como prova é o primeiro
  aceite de um texto; reescrever a data a cada candidatura apagaria justamente quando a pessoa
  concordou com aquele documento.
- versão guardada **diferente** (ou ausente) → re-registra as duas versões e `acceptedAt`.
- `declaredAdultAt` só é preenchido se estiver vazio. Declarar maioridade duas vezes não é mais
  verdadeiro que declarar uma.

### Regra 6: aceite não é efeito acessório
Falha ao gravar o aceite **derruba** a requisição, e a candidatura não é criada. Diferente do
e-mail de claim (best-effort desde 2026-08-24): um link de senha é conveniência, o registro de
aceite é a razão de o mecanismo existir.

### Regra 7: a exclusão de conta PRESERVA o aceite
`deleteMyAccount` não toca nos quatro campos. São uma versão e dois horários, que não identificam
a pessoa, e são a prova de que a relação existiu sob determinado texto. Ver `account-deletion`.

### Regra 8: o aceite entra na exportação de dados
`GET /influencers/me/export` e `GET /brands/me/export` devolvem os quatro campos em
`legalAcceptance`. É registro que guardamos sobre a pessoa (art. 18 II).

## API / Interfaces
Nenhuma rota nova. Três contratos existentes ganharam dois campos **obrigatórios**:

| Rota | Campos novos |
|---|---|
| `POST /auth/register/brand` | `acceptedTermsAndPrivacy: true`, `declaredAdult: true` |
| `POST /auth/register/influencer` | idem |
| `POST /programs/:id/apply/public` | idem |

**Mudança de contrato incompatível**: cliente antigo passa a receber `400`. Aceitável porque o
único cliente é o nosso front, publicado junto.

## UI Behavior

### As duas caixas
Componente único (`LegalAcceptanceFields`), nas variantes `dark` (candidatura pública) e `plate`
(os dois cadastros). Nenhuma nasce marcada. Nos cadastros ficam no **último passo**, junto do
"Criar conta": é preciso aceitar imediatamente antes de criar, não três passos antes.

Texto: "Li e concordo com os **Termos de Uso** e com a **Política de Privacidade**." e "Declaro
que tenho 18 anos ou mais."

### O `<label>` não envolve a frase
Só a caixa desenhada alterna o estado; a frase é ligada ao input por `aria-labelledby`.

Motivo (MORDEU na conferência visual de 2026-09-04): com o `<label>` envolvendo a frase, clicar em
"Termos de Uso" para **ler** o documento também marcava a caixa de aceite, porque clique em link
dentro de label ativa o controle do label. Numa caixa de consentimento isso registra aceite de
quem só quis abrir o documento.

### Links abrem em aba nova
`target="_blank"`. Quem está no meio de um cadastro de 3 passos perde tudo que digitou se navegar
para fora, e ninguém aceita um documento que não pode abrir.

### A candidatura pública avisa que cria conta
`/apply/:id` mostra, **antes** das caixas e do botão: que a candidatura cria (ou reusa) uma conta
de creator no TAYRO com os dados do formulário, que um e-mail para definir senha será enviado, e
que os dados públicos do Instagram passam a ser consultados e exibidos para a marca.

Era o furo apontado na auditoria: a conta nascia em silêncio.

## Acceptance Criteria
- [x] Caixa de aceite desmarcada por padrão nos três fluxos
- [x] Caixa de maioridade desmarcada por padrão nos três fluxos
- [x] Texto nomeia os dois documentos e linka os dois
- [x] Impossível concluir o cadastro sem marcar (validação no navegador)
- [x] Impossível criar conta sem marcar (validação no servidor, `@Equals(true)`)
- [x] Cliente não consegue ditar a versão aceita (`400`)
- [x] Versão explícita persistida, nunca só um booleano
- [x] Conta nova nasce com aceite no mesmo `create`
- [x] Conta que já existia passa a ter aceite ao se candidatar
- [x] Aceite da mesma versão não é reescrito
- [x] Versão anterior é re-registrada
- [x] `declaredAdultAt` já preenchido é preservado
- [x] Falha ao gravar o aceite não deixa a candidatura passar
- [x] Clicar no link do documento não marca a caixa
- [x] `/apply/:id` avisa da criação de conta antes do botão
- [x] Links nos rodapés da landing, das telas de autenticação e da Política
- [x] Texto dos Termos de Uso publicado em `/terms-of-use` (v1.0, 2026-09-04), com 22 cláusulas e
      a versão exibida no cabeçalho, batendo com `TERMS_VERSION`
- [x] Texto da Política de Privacidade publicado em `/privacy-policy` (v1.0, 2026-09-04), com 19
      seções e a versão exibida no cabeçalho, batendo com `PRIVACY_VERSION`
- [ ] Razão social, CPF/CNPJ e comarca do foro preenchidos nos dois documentos (ver Known Gaps)
- [ ] Re-aceite in-app para contas anteriores a 2026-09-04

## Error Scenarios
| Situação | Resposta |
|---|---|
| Campo de aceite ausente | `400` com as duas mensagens |
| `acceptedTermsAndPrivacy: false` | `400` "É necessário aceitar os Termos de Uso e a Política de Privacidade" |
| `declaredAdult: false` | `400` "É necessário declarar que você tem 18 anos ou mais" |
| `"true"` (string) | `400` (`@IsBoolean`) |
| Corpo com `acceptedTermsVersion` | `400` "property acceptedTermsVersion should not exist" |
| Falha de banco ao gravar aceite em conta existente | erro propaga, candidatura não é criada |

## Known Gaps
- **Os dois documentos têm campos a preencher, e isso bloqueia o release.** `/privacy-policy`
  (seção 1) e `/terms-of-use` (cláusula 22) mostram `[NOME / RAZÃO SOCIAL]`, `[CPF/CNPJ]` e
  `[ENDEREÇO]`; `/terms-of-use` (cláusula 21) mostra `[COMARCA / FORO]`. **Enquanto for assim,
  este mecanismo não pode ir para produção**: o documento aceito não identifica quem é o
  controlador nem a parte contratante, e gravar `acceptedTermsVersion: "1.0"` nesse cenário
  registra aceite de um documento que não diz com quem se está contratando. Os campos ficam
  VISÍVEIS na página de propósito, com teste travando a presença deles, para que a pendência não
  seja "resolvida" apagando o aviso em vez de preenchendo o dado.
- **Não há encarregado (DPO) formalmente designado**, e a Política diz isso. O canal indicado é o
  e-mail de contato.
- **Contas anteriores a 2026-09-04 ficam com `NULL`** e não há tela que peça o aceite a quem já
  está dentro. Fechar isso exige decidir o que fazer com quem recusar.
- **A declaração de maioridade não é verificável.** O produto não tem, e não passa a ter, nenhum
  meio de conferir idade nem de agir sobre uma conta de menor (não existe back-office).
- **Nenhum registro de qual TEXTO correspondia à versão.** Guardamos `"1.0"`, não um hash nem uma
  cópia do documento. Provar depois o que a v1.0 dizia depende do histórico do git.

## Test Coverage
- `apps/api/src/shared/legal/legal-acceptance.spec.ts` (23): `legalAcceptanceFields` e a matriz de
  validação dos três DTOs (ausente / `false` / string / versão vinda do cliente).
- `apps/api/src/modules/creators/application/creators.service.legal-acceptance.spec.ts` (7):
  conta nova, conta existente, não sobrescrever a mesma versão, re-registrar versão anterior,
  preservar `declaredAdultAt`, falha não é best-effort. Regra 5 validada por mutação.
- `apps/api/src/modules/auth/application/auth.service.spec.ts`: aceite gravado no `create` dos
  dois cadastros.
- `apps/api/src/modules/creators/application/creators.service.delete-account.spec.ts`: aceite
  preservado na exclusão.
- `apps/web/src/components/legal/LegalAcceptanceFields.spec.tsx` (10): desmarcadas por padrão,
  nome acessível com os dois documentos, links com `target=_blank`, **clique no link não marca**
  (validado por mutação), independência das duas caixas.
- Os três specs de página: não envia sem marcar cada uma das caixas, e o payload que chega à API.
- `apps/web/src/pages/public/PublicApplyPage.spec.tsx`: aviso de criação de conta presente e
  posicionado antes do botão.
- `apps/web/src/pages/public/TermsOfUsePage.spec.tsx` (17) e
  `PrivacyPolicyPage.spec.tsx` (27): além da estrutura (22 cláusulas / 19 seções) e da versão
  exibida, são **testes de honestidade** no padrão dos da landing. Eles exigem que o documento
  DIGA as negativas que o código impõe (não processa pagamento, não verifica identidade nem
  titularidade de `@`, sem integração oficial com Instagram/Meta, sem moderação, sem hospedagem
  de arquivo, sem SLA/uptime, exclusão não é total, texto livre permanece, e-mail não vai para a
  contraparte, idade é declarada) e proíbem o oposto (nenhum prazo de retenção numérico, nenhum
  terceiro que não está em uso como Cloudflare/analytics/gateway). Apagar uma negativa incômoda
  numa revisão de redação futura quebra o teste.
- `apps/web/src/components/layouts/AuthLayout.spec.tsx` (2).
- Verificado em HTTP real contra a API local (2026-09-04): aceite ausente → `400`, `false` →
  `400`, versão vinda do cliente → `400`, aceite válido → `201` com `"1.0"` gravado nas duas
  colunas.

## Current Implementation
Ver `implements` no frontmatter.

## Change History
- **2026-09-04**: criada. Aceite dos dois documentos e declaração de maioridade nos três fluxos de
  entrada, com versão explícita persistida no `User`. Correção do `<label>` que fazia o link do
  documento marcar a caixa de consentimento.
- **2026-09-04**: publicados os textos de `/terms-of-use` (22 cláusulas) e `/privacy-policy` (19
  seções), ambos v1.0, escritos a partir do código e da auditoria do mesmo dia. Os dois passam a
  exibir a versão no cabeçalho, que é o que dá sentido a `acceptedTermsVersion`/
  `acceptedPrivacyVersion`. Known Gap do "texto não existe" fechado; o bloqueio de release passa
  a ser apenas razão social, CPF/CNPJ, endereço e comarca do foro.
- **2026-09-09**: os dois documentos ganham versão em inglês (`pages/public/legal/`), como
  tradução de cortesia sob a MESMA versão `1.0`, com cláusula de prevalência do português. O
  registro de aceite não muda: nenhuma coluna nova, nenhum campo novo no DTO. Os rótulos dos links
  no produto deixam de dizer "(in Portuguese)". Ver Regra 4.
