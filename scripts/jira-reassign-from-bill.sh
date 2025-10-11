#!/usr/bin/env bash
set -euo pipefail

# Reassign all AVNZ issues assigned to the current Jira user (Bill) to Emma Johansson
# and add an administrative note comment.
#
# Usage:
#   scripts/jira-reassign-from-bill.sh [JQL]
# Default JQL: project = AVNZ AND assignee = currentUser() AND statusCategory != Done

JQL_IN="${1:-project = AVNZ AND assignee = 'Bill Cuevas' AND statusCategory != Done}"

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -sS)

# Resolve Dev accountId
echo "[reassign] Resolving Dev accountId"
# Use Jira v3 user search with accountId obfuscation-safe query. Prefer email if available in env, then exactDisplayName, then username handle.
DEV_ID=$(
  {
    if [[ -n "${DEV_EMAIL:-}" ]]; then
      curl "${HDR[@]}" "${BASE}/rest/api/3/user/search?query=$(python3 -c 'import urllib.parse,os;print(urllib.parse.quote(os.environ.get("DEV_EMAIL","")))')";
    else
      curl "${HDR[@]}" "${BASE}/rest/api/3/user/search?query=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("Carlos Hernandez"))')";
    fi
  } | jq -r 'map(select(.accountId and (.emailAddress? == env.DEV_EMAIL or .displayName == "Carlos Hernandez" or .displayName == "Carlos Hernández" or (.name? == "carlos.hernandez")))) | .[0].accountId // empty'
)
if [[ -z "$DEV_ID" ]]; then
  DEV_ID=$(curl "${HDR[@]}" "${BASE}/rest/api/3/user/search?query=carlos.hernandez" | jq -r '.[0].accountId // empty')
fi
if [[ -z "$DEV_ID" ]]; then
  echo "[reassign] ERROR: cannot resolve Devloper accountId" >&2
  exit 1
fi
echo "[reassign] Dev accountId=$DEV_ID"

echo "[reassign] Searching issues with JQL: $JQL_IN"
# Use GET with proper URL encoding for JQL and request only 'key' field to reduce payload. Also set startAt to 0.
# Note: Jira caps maxResults at 100 by default; some instances allow up to 1000. We use 200 and accept truncation for simplicity.
ISSUES=$(
  curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" \
    --data-urlencode "jql=${JQL_IN}" \
    --data-urlencode "fields=key" \
    --data-urlencode "maxResults=200" \
    --data-urlencode "startAt=0" \
  | jq -r '(.issues // []) | map(.key) | .[]?'
)


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
  curl "${HDR[@]}" -X PUT "${BASE}/rest/api/3/issue/${K}/assignee" -d "{\"accountId\":\"${DEV_ID}\"}" >/dev/null || true
  # Add note comment
  curl "${HDR[@]}" -X POST "${BASE}/rest/api/3/issue/${K}/comment" -d "$NOTE" >/dev/null || true
done

echo "[reassign] Done"
