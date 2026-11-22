#!/usr/bin/env bash
# Confere, depois do deploy, que a API em produção responde de verdade:
# GET <url> tem que dar 200 com {"status":"ok"} (o /health faz SELECT 1 no
# banco, então isso prova função de pé + variáveis + conexão com o Neon).
#
# Existe porque um deploy "verde" já colocou no ar uma função que não subia
# (FUNCTION_INVOCATION_FAILED com env faltando, D-24) e só um curl manual viu.
#
# Uso: smoke-health.sh <url>
# Env: SMOKE_ATTEMPTS (default 6), SMOKE_INTERVAL_SECONDS (default 10).
# Teste: .github/workflows/test/smoke-health.test.sh

set -uo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "::error::Uso: smoke-health.sh <url>"
  exit 2
fi

ATTEMPTS="${SMOKE_ATTEMPTS:-6}"
INTERVAL="${SMOKE_INTERVAL_SECONDS:-10}"
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

# Tentativas porque a 1ª chamada pega o cold start (cria o app Nest e conecta
# no banco) e o alias de produção pode levar alguns segundos pra apontar pro
# deployment novo.
LAST="sem resposta"
for i in $(seq 1 "$ATTEMPTS"); do
  CODE=$(curl -sS --max-time 30 -o "$BODY_FILE" -w '%{http_code}' "$URL" 2>/dev/null)
  BODY=$(cat "$BODY_FILE" 2>/dev/null)
  if [ "$CODE" = "200" ] && grep -q '"status":"ok"' <<< "$BODY"; then
    echo "API ok na tentativa $i: $URL"
    exit 0
  fi
  LAST="HTTP ${CODE:-sem resposta}: $(tr -s "\n" " " <<< "$BODY" | head -c 200)"
  echo "tentativa $i/$ATTEMPTS: $LAST"
  [ "$i" -lt "$ATTEMPTS" ] && sleep "$INTERVAL"
done

echo "::error::A API não respondeu saudável depois do deploy ($URL). Último: $LAST"
echo "Produção pode estar quebrada. Ver logs da função na Vercel; pra voltar, promova o deployment anterior (Instant Rollback)."
exit 1
