-- Aceite dos documentos legais (Termos de Uso + Política de Privacidade) e
-- declaração de maioridade.
--
-- ADITIVA de propósito: todas as colunas são nullable e sem default. Conta
-- criada antes deste release fica com NULL, que é o fato correto (nunca viu
-- uma caixa pra marcar) — preencher retroativamente seria inventar prova de
-- aceite. Não há DROP nem NOT NULL aqui, então esta migration é compatível
-- com o código antigo e com o novo em qualquer ordem de deploy
-- (ver CLAUDE.md → migration destrutiva).
ALTER TABLE "users" ADD COLUMN "acceptedTermsVersion" TEXT;
ALTER TABLE "users" ADD COLUMN "acceptedPrivacyVersion" TEXT;
ALTER TABLE "users" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "declaredAdultAt" TIMESTAMP(3);
