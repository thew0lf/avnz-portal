#!/usr/bin/env bash
set -euo pipefail

# Set a default priority for all issues matching a JQL when priority is empty/Lowest or when forced.
# Usage:
#   scripts/jira-set-default-priority.sh 'project = AVNZ AND (priority is EMPTY OR priority = Lowest)' Medium
#   scripts/jira-set-default-priority.sh 'project = AVNZ AND statusCategory != Done' High --force

JQL_IN="${1:-}"
PRIORITY="${2:-Medium}"
FORCE="${3:-}"

if [[ -z "$JQL_IN" ]]; then
  echo "Usage: $0 '<JQL>' <PriorityName> [--force]" >&2
  exit 2
fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -sS)

echo "[priority] Searching issues…"
ISSUES=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL_IN}" --data-urlencode "fields=key,priority" --data-urlencode "maxResults=500" | jq -r '.issues[] | [.key, (.fields.priority.name // "")] | @tsv')

if [[ -z "$ISSUES" ]]; then
  echo "[priority] No matching issues"
  exit 0
fi

while IFS=$'\t' read -r KEY CURR; do
  [[ -z "$KEY" ]] && continue
  if [[ "$FORCE" != "--force" ]]; then
    if [[ -n "$CURR" && "$CURR" != "Lowest" ]]; then
      echo "[skip] $KEY priority=$CURR"
      continue
    fi
  fi
  echo "[set] $KEY -> $PRIORITY"
  curl "${HDR[@]}" -X PUT "${BASE}/rest/api/3/issue/${KEY}" -d "{\"fields\":{\"priority\":{\"name\":\"${PRIORITY}\"}}}" >/dev/null || true
done < <(printf '%s\n' "$ISSUES")

echo "[priority] Done"

