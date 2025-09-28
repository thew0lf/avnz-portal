#!/usr/bin/env bash
set -euo pipefail

# confluence-verify.sh — Lists space AVNZ and pages

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env"; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

SPACE_KEY="${1:-AVNZ}"
BASE="https://${JIRA_DOMAIN}/wiki"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

echo "[conf-verify] Space ${SPACE_KEY}"
curl -sS -f "${HDR[@]}" \
  "${BASE}/rest/api/space/${SPACE_KEY}?expand=homepage" | jq -r '{key,name,homepage_id:(.homepage.id)}'

echo "[conf-verify] Pages in space (title -> id)"
curl -sS -f "${HDR[@]}" \
  "${BASE}/rest/api/content?spaceKey=${SPACE_KEY}&type=page&limit=200" | jq -r '.results[] | "- \(.title) -> \(.id)"'
