#!/usr/bin/env bash
set -euo pipefail

# Reassign all AVNZ issues assigned to the current Jira user (Bill) to Emma Johansson
# and add an administrative note comment.
#
# Usage:
#   scripts/jira-reassign-from-bill.sh [JQL]
# Default JQL: project = AVNZ AND assignee = currentUser() AND statusCategory != Done

JQL_IN="${1:-project = AVNZ AND assignee = currentUser() AND statusCategory != Done}"

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -sS)

# Resolve Emma accountId
echo "[reassign] Resolving Emma accountId"
EMMA_ID=$(curl "${HDR[@]}" "${BASE}/rest/api/3/user/search?query=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("Emma Johansson"))')" | jq -r '.[0].accountId // empty')
if [[ -z "$EMMA_ID" ]]; then
  EMMA_ID=$(curl "${HDR[@]}" "${BASE}/rest/api/3/user/search?query=emma.johansson" | jq -r '.[0].accountId // empty')
fi
if [[ -z "$EMMA_ID" ]]; then
  echo "[reassign] ERROR: cannot resolve Emma accountId" >&2
  exit 1
fi
echo "[reassign] Emma accountId=$EMMA_ID"

echo "[reassign] Searching issues with JQL: $JQL_IN"
ISSUES=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL_IN}" --data-urlencode "fields=key" --data-urlencode "maxResults=200" | jq -r '.issues[].key')

if [[ -z "$ISSUES" ]]; then
  echo "[reassign] No matching issues"
  exit 0
fi

NOTE=$(python3 - <<'PY'
import json
msg = """
Administrative note: Bill Cuevas should never be assigned to delivery tasks.
This ticket was automatically reassigned to the Product Owner (Emma Johansson).
If you have questions, mention @emma.johansson.
""".strip()
print(json.dumps({"body": msg}))
PY
)

for K in $ISSUES; do
  echo "[reassign] $K -> Emma"
  # Set assignee
  curl "${HDR[@]}" -X PUT "${BASE}/rest/api/3/issue/${K}/assignee" -d "{\"accountId\":\"${EMMA_ID}\"}" >/dev/null || true
  # Add note comment
  curl "${HDR[@]}" -X POST "${BASE}/rest/api/3/issue/${K}/comment" -d "$NOTE" >/dev/null || true
done

echo "[reassign] Done"
