#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Usage ─────────────────────────────────────────────────────────────────────
BUILD_TYPE="${1:-}"
if [[ "$BUILD_TYPE" != "jsOnly" && "$BUILD_TYPE" != "full" ]]; then
  echo "Usage: $(basename "$0") <jsOnly|full>" >&2
  echo "  jsOnly  — Vite + in-place JAR update, no Java compilation (~9s)" >&2
  echo "  full    — Vite + full mvnd package, use for Java changes or first run (~21s)" >&2
  exit 1
fi

# ── Prerequisites ─────────────────────────────────────────────────────────────
command -v mvnd &>/dev/null \
  || { echo "✗ mvnd is required. Install: mise use -g mvnd  or  brew install mvnd" >&2; exit 1; }

[[ -f "$SCRIPT_DIR/.env" ]] \
  || { echo "✗ .env not found. Create it with JAHIA_URL, JAHIA_USER, JAHIA_PASS." >&2; exit 1; }
source "$SCRIPT_DIR/.env"

elapsed() { printf "%dm%02ds" $(( ($(date +%s) - $1) / 60 )) $(( ($(date +%s) - $1) % 60 )); }
t_start=$(date +%s)

# ── Frontend build ────────────────────────────────────────────────────────────
echo "==> Building frontend..."
# Call Vite directly — avoids ~8s of yarn/corepack startup overhead.
node node_modules/.bin/vite build --mode development

# ── Package ───────────────────────────────────────────────────────────────────
if [[ "$BUILD_TYPE" == "jsOnly" ]]; then
  JAR="$(ls "$SCRIPT_DIR"/target/kfind-*.jar 2>/dev/null | grep -v sources | head -1)"
  [[ -z "$JAR" ]] && { echo "✗ No JAR found — run './deploy.sh full' first." >&2; exit 1; }
  echo "==> Updating JAR in-place (skipping Maven)..."
  # Content-hashed filenames change every build — delete old entries before re-adding.
  zip -qd "$JAR" "javascript/*" "locales/*" 2>/dev/null || true
  (cd "$SCRIPT_DIR/src/main/resources" && zip -qr "$JAR" javascript/ locales/)
else
  echo "==> Running full Maven build..."
  # -Dexec.skip=true : frontend already built above
  # -o               : offline, skip remote repo checks (deps cached locally)
  mvnd package -Dexec.skip=true -o -q
  JAR="$(ls "$SCRIPT_DIR"/target/kfind-*.jar 2>/dev/null | grep -v sources | head -1)"
  [[ -z "$JAR" ]] && { echo "✗ No JAR found after Maven build." >&2; exit 1; }
fi

echo "==> JAR: $(basename "$JAR") ($(du -h "$JAR" | cut -f1))"

# ── Deploy ────────────────────────────────────────────────────────────────────
SCRIPT_JSON="[{\"installBundle\":\"$(basename "$JAR")\", \"autoStart\": true, \"forceUpdate\": true, \"uninstallPreviousVersion\": true}]"

echo "==> Deploying to $JAHIA_URL ..."
HTTP_RESPONSE=$(curl --silent --show-error --max-time 120 --write-out "\nHTTP_STATUS:%{http_code}" \
  -u "$JAHIA_USER:$JAHIA_PASS" -X POST "$JAHIA_URL/modules/api/provisioning" \
  --form "script=$SCRIPT_JSON" --form "file=@$JAR")

HTTP_STATUS=$(echo "$HTTP_RESPONSE" | grep "^HTTP_STATUS:" | cut -d: -f2)

if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
  echo "✓ Done in $(elapsed $t_start) (HTTP $HTTP_STATUS)"
else
  echo "$HTTP_RESPONSE" | sed '/^HTTP_STATUS:/d'
  echo "✗ Deployment failed (HTTP $HTTP_STATUS)" >&2
  exit 1
fi
