#!/usr/bin/env bash
# Imprime a URL DIRETA do Neon a partir da DATABASE_URL do pooler.
#
# A app usa o pooler (`-pooler` no host): muitas conexões curtas da função
# serverless. Migration não: o `prisma migrate` usa advisory lock, que não
# sobrevive ao pooler em modo transação. O endpoint direto do Neon é o mesmo
# host sem o `-pooler`, então derivamos em vez de manter um 2º secret.
#
# Só o HOSTNAME é tocado (via URL do Node), nunca usuário/senha/query.
# Teste: .github/workflows/test/direct-database-url.test.sh
set -uo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "::error::DATABASE_URL vazia" >&2
  exit 1
fi

node -e '
  const u = new URL(process.env.DATABASE_URL);
  u.hostname = u.hostname.replace(/-pooler(?=\.)/, "");
  process.stdout.write(u.toString());
'
