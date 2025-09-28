#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env"; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

PROJECT_KEY="${1:-AVNZ}"
BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

curl -sS -f \
  -H "Authorization: Basic ${AUTH_B64}" \
  -H "Content-Type: application/json" \
  "${BASE}/rest/api/3/project/${PROJECT_KEY}/role" | jq -r 'to_entries[] | [.key, .value] | @tsv'

