---
slug: account-data-export
status: ACTIVE
origin: FEATURE
source_of_truth: product_decision
last_updated: 2026-09-03
implements:
  - apps/api/src/modules/creators/presentation/influencers.controller.ts (GET /influencers/me/export)
  - apps/api/src/modules/creators/application/creators.service.ts (exportMyData)
  - apps/api/src/modules/brands/presentation/brands.controller.ts (GET /brands/me/export)
  - apps/api/src/modules/brands/application/brands.service.ts (exportMyData)
  - apps/web/src/components/account/AccountSection.tsx
related_decisions: []
---

# Exportar meus dados

## Objective
Último item do Bloco 1 de LGPD (`.claude/knowledge/roadmap.md`) — acesso e portabilidade
(art. 18 II e V). Até esta capacidade, não existia nenhuma forma de uma marca ou creator obter
uma cópia estruturada do que o TAYRO guarda sobre ela. `origin: FEATURE`: o item já estava
registrado como veredito equivalente ao `AGORA` no roadmap (Bloco 1, "sem decisão pendente, só
código") e em `CLAUDE.md` → Pendente.

## Scope
Exportação, sob demanda, de todo o dado fornecido ou gerado sobre a conta autenticada (`BRAND`
ou `INFLUENCER`), num único JSON baixado pelo próprio navegador.

## Out of Scope
- Exportação assíncrona/por e-mail (volume por conta é pequeno; síncrono basta).
- Formatos além de JSON (CSV, PDF).
- Exportação de dado de terceiro sobre outra pessoa titular — ex.: campanhas da marca trazem
  só a *contagem* de candidaturas, nunca o dado de cada creator candidata.
- Exclusão de conta — ver `account-deletion` (capacidade separada, mesmo plano de LGPD).

## Domain
Reaproveita os modelos existentes (`Influencer`, `Brand`, `Application`, `ContentSubmission`,
`Reward`, `PartnershipResult`) — nenhum campo ou tabela novos. A exportação é uma **leitura**,
sem efeito colateral no domínio.

## Behavior
1. A exportação da creator reúne: perfil (identidade + dado do Instagram cacheado por nós),
   candidaturas (com a campanha/oferta e as sub-relações de conteúdo enviado e resultado de
   parceria) e recompensas recebidas.
2. A exportação da marca reúne: perfil, campanhas criadas (com a *contagem* de candidaturas,
   nunca a lista de creators candidatas), recompensas que ela emitiu e resultados de parceria
   que ela registrou.
3. **Nunca inclui segredo técnico da conta**: hash de senha, `refreshTokenHash`,
   `claimTokenHash`/`resetTokenHash` e seus `*ExpiresAt`. Esses campos não são dado pessoal que
   a LGPD pede para devolver — são credencial de sessão.
4. **Nunca inclui os bytes de `IgImage`**: são cache técnico de uma foto pública de terceiro
   (Instagram), não algo que a pessoa forneceu ao TAYRO. A `sourceUrl` e os metadados de
   `igRecentPosts` (URLs, likes, comentários) já cobrem "o que guardamos vindo do Instagram".

## API / Interfaces

| Método | Rota | Guard | Notas |
|---|---|---|---|
| GET | `/influencers/me/export` | `JwtAuthGuard`, `RolesGuard` (`INFLUENCER`) | `200` com o JSON completo, ou `403` sem perfil. |
| GET | `/brands/me/export` | `JwtAuthGuard`, `RolesGuard` (`BRAND`) | `200` com o JSON completo, ou `403` sem perfil. |

Sem paginação — o volume de dado por conta é pequeno o suficiente para uma resposta só.

## UI Behavior
Row "Exportar meus dados" na seção "Conta" (`AccountSection`, presente nas duas telas de
Perfil) — ação direta, sem modal de confirmação (é leitura, não é destrutivo). Ao clicar: `GET`
na rota certa por papel, monta um `Blob` do JSON e dispara o download via `<a download>`
sintético (`tayro-meus-dados-<data>.json`). Estado inline na própria row: "Exportando…" →
"Baixado" (2s) ou mensagem de erro genérica, sem sair da tela.

## Acceptance Criteria
- [x] Creator sem perfil recebe `403`, marca sem perfil recebe `403`.
- [x] O `select` do perfil nunca alcança `password`/`refreshTokenHash`/`claimTokenHash`/
      `resetTokenHash` nem a relação `IgImage`.
- [x] Campanhas da marca trazem contagem de candidaturas, nunca a lista de creators.
- [x] A row "Exportar meus dados" aparece nas duas telas de Perfil, disparando o `GET` certo
      por papel.
- [x] Erro de rede mostra mensagem inline, sem quebrar a tela.

## Error Scenarios
- `403` conta sem perfil de creator/marca (mesmo padrão de `getMe`).
- Erro de rede no frontend → mensagem genérica inline na própria row, sem modal.

## Known Gaps
- Sem exportação de conta `ADMIN` (papel sem tela de Perfil própria hoje).
- JSON não é assinado nem tem hash de integridade — não é um requisito da LGPD, só uma cópia
  legível pela própria pessoa.

## Test Coverage
- `apps/api/src/modules/creators/application/creators.service.export.spec.ts` — `- [x]` 403 sem
  perfil, `- [x]` e-mail achatado no retorno, `- [x]` select nunca alcança campo sensível,
  `- [x]` applications/rewards filtrados pelo influencerId.
- `apps/api/src/modules/brands/application/brands.service.export.spec.ts` — `- [x]` 403 sem
  perfil, `- [x]` e-mail achatado, `- [x]` campanhas só com contagem de candidaturas, `- [x]`
  campanhas/recompensas/resultados filtrados pela marca.
- `apps/api/src/modules/creators/presentation/influencers.controller.guards.spec.ts` e
  `apps/api/src/modules/brands/presentation/brands.controller.guards.spec.ts` (novos) — `- [x]`
  guard de classe (`JwtAuthGuard`) e de método (`RolesGuard`) em toda rota, `exportMyData`
  incluído no regressivo.
- `apps/web/src/components/account/AccountSection.spec.tsx` (novo) — `- [x]` row aparece pros
  dois papéis, `- [x]` dispara o `GET` certo por papel, `- [x]` cria o download (Blob +
  `<a download>`), `- [x]` erro mostra mensagem sem quebrar.
- `apps/web/src/pages/{brand,influencer}/ProfilePage.spec.tsx` — `- [x]` row existe na tela
  real, com `role` amarrado corretamente.

## Current Implementation
- `CreatorsService.exportMyData`/`BrandsService.exportMyData` — mesmo padrão de `getMe`
  (`select` explícito, nunca `include` genérico), mas com `Promise.all` para as relações que
  não cabem num único `findUnique`.
- `AccountSection` ganhou a prop `role: 'BRAND' | 'INFLUENCER'` — antes só recebia `email`.

## Change History
- 2026-09-03 · implementação inicial — endpoints, exportação de perfil/candidaturas/recompensas
  (creator) e perfil/campanhas/recompensas/resultados (marca), row "Exportar meus dados" na
  seção Conta.
