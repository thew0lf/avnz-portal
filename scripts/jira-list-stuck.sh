#!/usr/bin/env bash
set -euo pipefail

# Lists Jira issues that are likely stuck due to content/QA/Review gates.
# Requires JIRA_EMAIL, JIRA_API_TOKEN, JIRA_DOMAIN in env or .env.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env" 2>/dev/null || true; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

JQL=${1:-'project = AVNZ AND statusCategory != Done'}

echo "[stuck] Query: ${JQL}"
DATA=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL}" --data-urlencode "fields=key,summary,status,labels,updated" --data-urlencode "maxResults=200")
echo "$DATA" | jq -r '.issues[] | select((.fields.labels|index("needs-details") or .fields.labels|index("review-failed") or .fields.labels|index("qa-failed")) != null) | "- \(.key) [\(.fields.status.name)] labels=\(.fields.labels | join(",")) \(.fields.summary)"'

echo
echo "[stale >= 30m]"
DATA2=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=(${JQL}) AND updated <= -30m" --data-urlencode "fields=key,summary,status,updated" --data-urlencode "maxResults=200")
echo "$DATA2" | jq -r '.issues[] | "- \(.key) [\(.fields.status.name)] updated=\(.fields.updated) \(.fields.summary)"'

