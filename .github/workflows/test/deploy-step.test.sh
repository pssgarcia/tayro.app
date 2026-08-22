#!/usr/bin/env bash
# Harness do step de deploy do CD: roda o script REAL extraído do cd.yml contra
# um `npx` falso, cobrindo os cenários que já morderam em produção.
#
# Uso:  bash .github/workflows/test/deploy-step.test.sh
#
# Existe porque esse step só era exercitável mergeando na main e torcendo — e
# custou 6 releases vermelhas até a causa ficar clara. O script roda de verdade
# aqui; só o CLI do Railway é falso.

set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CD_YML="${1:-$HERE/../cd.yml}"
WORK="$HERE/.mock"

# Extrai o bloco `run: |` do step do Railway direto do YAML — assim o teste
# sempre roda o script que está em produção, não uma cópia que envelhece.
STEP="$WORK/step.sh"
mkdir -p "$WORK"
node -e '
  const fs = require("fs");
  const src = fs.readFileSync(process.argv[1], "utf8");
  const i = src.indexOf("- name: Deploy API to Railway");
  const j = src.indexOf("run: |", i) + "run: |".length;
  const k = src.indexOf("# ─── Web → Vercel", j);
  if (i < 0 || k < 0) { console.error("step não encontrado em " + process.argv[1]); process.exit(1); }
  const body = src.slice(j, k).split("\n").map((l) => l.startsWith(" ".repeat(10)) ? l.slice(10) : l);
  fs.writeFileSync(process.argv[2], body.join("\n"));
' "$CD_YML" "$STEP" || exit 1
mkdir -p "$WORK/bin"
# PATH é separado por ':' — um caminho Windows ("C:/...") o corrompe e o shim
# nunca é encontrado (o npx REAL roda e os testes passam pelo motivo errado).
BIN_POSIX="$(cd "$WORK/bin" && pwd)"
PASS=0; FAIL=0

UUID="beb87024-fbb9-48e9-9fd6-b7fd335af19e"

# `npx` falso: lê o cenário de env vars e responde de acordo.
cat > "$WORK/bin/npx" <<'SHIM'
#!/usr/bin/env bash
# $1 = pacote do cli, $2 = subcomando
case "$2" in
  up)
    [ "${MOCK_UP_FAILS:-0}" = "1" ] && { echo "erro de upload"; exit 1; }
    echo "Indexing..."
    echo "Uploading..."
    [ "${MOCK_NO_ID:-0}" = "1" ] || \
      echo "  Build Logs: https://railway.com/project/pid/service/sid?id=${MOCK_UUID}&"
    exit 0
    ;;
  deployment)
    n_file="${MOCK_STATE_DIR}/calls"
    n=$(cat "$n_file" 2>/dev/null || echo 0); n=$((n+1)); echo "$n" > "$n_file"
    # Primeiras chamadas devolvem status intermediário; depois, o final.
    if [ "$n" -lt "${MOCK_TERMINAL_AFTER:-1}" ]; then
      st="BUILDING"
    else
      st="${MOCK_FINAL_STATUS:-SUCCESS}"
    fi
    case "${MOCK_SHAPE:-flat}" in
      flat)    printf '[{"id":"%s","status":"%s"}]' "$MOCK_UUID" "$st" ;;
      wrapped) printf '{"deployments":{"edges":[{"node":{"id":"%s","status":"%s"}}]}}' "$MOCK_UUID" "$st" ;;
      absent)  printf '[{"id":"outro-id","status":"SUCCESS"}]' ;;
      garbage) printf 'nao e json' ;;
    esac
    exit 0
    ;;
esac
exit 0
SHIM
chmod +x "$WORK/bin/npx"

run_case() {
  local name="$1" expected="$2"; shift 2
  local dir="$WORK/state-$RANDOM"; mkdir -p "$dir"
  local out
  out=$(env PATH="$BIN_POSIX:$PATH" MOCK_UUID="$UUID" MOCK_STATE_DIR="$dir" \
        RAILWAY_TOKEN=fake RAILWAY_SERVICE=svc RAILWAY_CLI=cli \
        POLL_TIMEOUT_SECONDS="${TIMEOUT_OVERRIDE:-6}" POLL_INTERVAL_SECONDS=1 \
        "$@" bash "$STEP" 2>&1)
  local code=$?
  if [ "$code" = "$expected" ]; then
    echo "  ✓ $name (exit $code)"; PASS=$((PASS+1))
  else
    echo "  ✗ $name — esperado exit $expected, veio $code"; echo "$out" | sed 's/^/      /' | head -8
    FAIL=$((FAIL+1))
  fi
}

echo "Cenários:"
run_case "deploy conclui com SUCCESS"                    0 MOCK_FINAL_STATUS=SUCCESS
run_case "build pulado (só docs) → SKIPPED conta sucesso" 0 MOCK_FINAL_STATUS=SKIPPED
run_case "build falhou → FAILED"                          1 MOCK_FINAL_STATUS=FAILED
run_case "container quebrou → CRASHED"                    1 MOCK_FINAL_STATUS=CRASHED
run_case "BUILDING antes de SUCCESS (poll de verdade)"    0 MOCK_FINAL_STATUS=SUCCESS MOCK_TERMINAL_AFTER=3
run_case "upload falha → não publica"                     1 MOCK_UP_FAILS=1
run_case "sem id na saída do CLI → falha explícita"       1 MOCK_NO_ID=1
run_case "JSON aninhado (wrapper diferente)"              0 MOCK_SHAPE=wrapped MOCK_FINAL_STATUS=SUCCESS
run_case "status nunca aparece → timeout, não sucesso"    1 MOCK_SHAPE=absent
run_case "JSON inválido → timeout, não sucesso"           1 MOCK_SHAPE=garbage
run_case "status desconhecido → NÃO passa como sucesso"   1 MOCK_FINAL_STATUS=NEEDS_APPROVAL

echo
echo "passou: $PASS   falhou: $FAIL"
[ "$FAIL" -eq 0 ]
