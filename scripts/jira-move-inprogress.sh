#!/usr/bin/env bash
set -euo pipefail

# Move one or more Jira issues to "In Progress" if that transition exists.
# Usage: scripts/jira-move-inprogress.sh AVNZ-11 AVNZ-12 ...

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -sS)

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 ISSUE_KEY [ISSUE_KEY...]" >&2
  exit 2
fi

for KEY in "$@"; do
  TID=$(curl "${HDR[@]}" "${BASE}/rest/api/3/issue/${KEY}/transitions" | jq -r '.transitions[] | select(.name=="In Progress") | .id' | head -n1)
  if [[ -n "$TID" ]]; then
    curl "${HDR[@]}" -X POST "${BASE}/rest/api/3/issue/${KEY}/transitions" -d "{\"transition\":{\"id\":\"${TID}\"}}" >/dev/null && echo "[in-progress] ${KEY}"
  else
    echo "[skip] ${KEY}: no 'In Progress' transition"
  fi
done

