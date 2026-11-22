#!/usr/bin/env bash
# Testa .github/scripts/direct-database-url.sh.
# Uso:  bash .github/workflows/test/direct-database-url.test.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../../scripts/direct-database-url.sh"
PASS=0; FAIL=0

check() { # nome, entrada, saída esperada, exit esperado
  local out got
  out=$(DATABASE_URL="$2" bash "$SCRIPT" 2>/dev/null); got=$?
  if [ "$out" = "$3" ] && [ "$got" = "$4" ]; then PASS=$((PASS+1)); echo "ok   $1"
  else FAIL=$((FAIL+1)); echo "FAIL $1: saiu '$out' (exit $got)"; fi
}

check "tira o -pooler do host" \
  'postgresql://u:p@ep-calm-1234-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' \
  'postgresql://u:p@ep-calm-1234.us-east-1.aws.neon.tech/neondb?sslmode=require' 0
check "não mexe em -pooler fora do host (senha)" \
  'postgresql://u:a-pooler.b@ep-calm-1234-pooler.us-east-1.aws.neon.tech/neondb' \
  'postgresql://u:a-pooler.b@ep-calm-1234.us-east-1.aws.neon.tech/neondb' 0
check "URL já direta passa igual" \
  'postgresql://u:p@ep-calm-1234.us-east-1.aws.neon.tech/neondb' \
  'postgresql://u:p@ep-calm-1234.us-east-1.aws.neon.tech/neondb' 0
check "sem DATABASE_URL falha" '' '' 1

echo "$PASS ok, $FAIL falhas"
[ "$FAIL" -eq 0 ]
