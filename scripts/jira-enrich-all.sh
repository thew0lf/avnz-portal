#!/usr/bin/env bash
set -euo pipefail

# Enrich all matching issues with structured brief and owner instructions via the portal API.
# Usage:
#   scripts/jira-enrich-all.sh 'project = AVNZ AND statusCategory != Done'
#   (default JQL if omitted: all non-Done issues in AVNZ)

JQL="${1:-project = AVNZ AND statusCategory != Done ORDER BY created DESC}"

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

ISSUES=$(curl "${HDR[@]}" "${BASE}/rest/api/3/search?jql=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$JQL")&fields=key" | jq -r '.issues[].key')

if [[ -z "$ISSUES" ]]; then
  echo "[enrich] No issues found for JQL: $JQL" >&2
  exit 0
fi

SVC_TOKEN_LINE=$(rg -n '^SERVICE_TOKEN=' -S .env | sed -E 's/.*=//')
if [[ -z "$SVC_TOKEN_LINE" ]]; then
  echo "[enrich] SERVICE_TOKEN not set in .env" >&2
  exit 2
fi
TOKEN="$SVC_TOKEN_LINE"

for K in $ISSUES; do
  echo "[enrich] $K"
  curl -sS -H "x-service-token: $TOKEN" -H "Content-Type: application/json" -X POST -d "{\"key\":\"$K\"}" http://localhost:3001/jira/enrich >/dev/null || true
done

echo "[enrich] Done"

