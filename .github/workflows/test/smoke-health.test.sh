#!/usr/bin/env bash
# Testa .github/scripts/smoke-health.sh (o step que confere a API depois do
# deploy) contra um `curl` falso. O script roda de verdade; só a rede é falsa.
#
# Uso:  bash .github/workflows/test/smoke-health.test.sh

set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../../scripts/smoke-health.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/bin"
PASS=0; FAIL=0

# `curl` falso: responde conforme MOCK_RESPONSES, um item por chamada
# ("codigo|corpo", separados por ';'). Depois do último, repete o último.
cat > "$WORK/bin/curl" <<'SHIM'
#!/usr/bin/env bash
n_file="$MOCK_DIR/calls"
n=$(cat "$n_file" 2>/dev/null || echo 0); n=$((n+1)); echo "$n" > "$n_file"
IFS=';' read -ra R <<< "$MOCK_RESPONSES"
i=$(( n <= ${#R[@]} ? n - 1 : ${#R[@]} - 1 ))
code="${R[$i]%%|*}"; body="${R[$i]#*|}"
[ "$code" = "000" ] && exit 7   # falha de conexão
# O script usa -o <arquivo> -w '%{http_code}'
out=""; prev=""
for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; prev="$a"; done
printf '%s' "$body" > "${out:-/dev/stdout}"
printf '%s' "$code"
SHIM
chmod +x "$WORK/bin/curl"

run() { # nome, exit esperado, respostas, [texto esperado na saída]
  local name="$1" want="$2" responses="$3" expect="${4:-}"
  rm -f "$WORK/calls"
  local out
  out=$(PATH="$WORK/bin:$PATH" MOCK_DIR="$WORK" MOCK_RESPONSES="$responses" \
        SMOKE_ATTEMPTS=3 SMOKE_INTERVAL_SECONDS=0 \
        bash "$SCRIPT" "https://exemplo.test/api/v1/health" 2>&1)
  local got=$?
  if [ "$got" = "$want" ] && { [ -z "$expect" ] || grep -q "$expect" <<< "$out"; }; then
    PASS=$((PASS+1)); echo "ok   $name"
  else
    FAIL=$((FAIL+1)); echo "FAIL $name (exit $got, esperado $want)"; echo "$out" | sed 's/^/     /'
  fi
}

run "200 com status ok passa"               0 '200|{"status":"ok"}'
run "503 em todas as tentativas falha"      1 '503|{"message":"Serviço indisponível"}' "::error::"
run "500 e depois 200 passa (cold start)"   0 '500|x;200|{"status":"ok"}'
run "200 sem status ok falha (não é a API)" 1 '200|<!doctype html>' "::error::"
run "sem conexão falha"                     1 '000|'
run "falha mostra o último código"          1 '502|bad' "502"
run "desiste depois de SMOKE_ATTEMPTS"      1 '503|x;503|x;503|x;200|{"status":"ok"}'

# Sem URL é erro de uso, não sucesso silencioso.
if bash "$SCRIPT" >/dev/null 2>&1; then FAIL=$((FAIL+1)); echo "FAIL sem URL deveria falhar"; else PASS=$((PASS+1)); echo "ok   sem URL falha"; fi

echo "$PASS ok, $FAIL falhas"
[ "$FAIL" -eq 0 ]
