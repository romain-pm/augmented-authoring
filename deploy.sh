#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

elapsed() {
  local secs=$(( $(date +%s) - $1 ))
  printf "%dm%02ds" $(( secs / 60 )) $(( secs % 60 ))
}

if [[ -f "$SCRIPT_DIR/.env" ]]; then
  source "$SCRIPT_DIR/.env"
else
  echo "✗ .env file not found. Create it with JAHIA_URL, JAHIA_USER, JAHIA_PASS." >&2
  exit 1
fi

echo "==> Building module (dev)..."
cd "$SCRIPT_DIR"
t_build=$(date +%s)
mvn clean install -P dev -q
echo "==> Build done in $(elapsed $t_build)"

JAR="$(ls "$SCRIPT_DIR"/target/kfind-*.jar 2>/dev/null | grep -v sources | head -1)"
[[ -z "$JAR" ]] && { echo "✗ No JAR found in target/ after build." >&2; exit 1; }
echo "==> JAR: $(basename "$JAR") ($(du -h "$JAR" | cut -f1))"

SCRIPT_JSON="[{\"installBundle\":\"$(basename "$JAR")\", \"autoStart\": true, \"forceUpdate\": true, \"uninstallPreviousVersion\": true}]"

echo "==> Sending provisioning request to $JAHIA_URL/modules/api/provisioning ..."
t_deploy=$(date +%s)
HTTP_RESPONSE=$(curl --silent --show-error --max-time 120 --write-out "\nHTTP_STATUS:%{http_code}" \
  -u "$JAHIA_USER:$JAHIA_PASS" -X POST "$JAHIA_URL/modules/api/provisioning" \
  --form "script=$SCRIPT_JSON" --form "file=@$JAR")

HTTP_STATUS=$(echo "$HTTP_RESPONSE" | grep "^HTTP_STATUS:" | cut -d: -f2)
echo "==> Deploy done in $(elapsed $t_deploy) (HTTP $HTTP_STATUS)"

if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
  echo "✓ Deployment succeeded — total: $(elapsed $t_build)"
else
  echo "$HTTP_RESPONSE" | sed '/^HTTP_STATUS:/d'
  echo "✗ Deployment failed (HTTP $HTTP_STATUS)" >&2
  exit 1
fi
