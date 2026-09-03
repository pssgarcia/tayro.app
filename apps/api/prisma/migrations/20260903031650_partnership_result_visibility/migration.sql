-- Resultado de parceria: visibilidade em duas camadas independentes (D-21, fecha D-D).
--
-- `visibleToCreator` sai porque a creator passa a ver SEMPRE o resultado que a
-- marca registrou — gatear isso era o oposto do diferencial nº 3
-- (transparência bilateral). A coluna nunca teve escritor em nenhum ambiente
-- (nenhum código do repositório jamais criou um PartnershipResult), então a
-- tabela está vazia e o DROP não descarta dado de ninguém.
--
-- Entram os dois consentimentos que a vitrine pública exige, ambos desligados
-- por padrão: o da marca (alcance/cupons são dado comercial dela) e o opt-out
-- da creator sobre a própria página.
ALTER TABLE "partnership_results"
  DROP COLUMN "visibleToCreator",
  ADD COLUMN "brandAllowsPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hiddenByCreator" BOOLEAN NOT NULL DEFAULT false,
  -- DEFAULT explícito (o Prisma geraria NOT NULL sem default, que falharia numa
  -- tabela com linhas): @updatedAt é escrito pelo client em toda gravação.
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
