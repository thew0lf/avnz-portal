#!/usr/bin/env bash
set -euo pipefail

# Annotate the latest RPS Epic and Tasks with portal job links and move tasks to In Progress.
# Uses .env: JIRA_EMAIL, JIRA_API_TOKEN, JIRA_DOMAIN

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -sS)

PROJECT_KEY="${PROJECT_KEY:-AVNZ}"

# Portal job IDs to link (pass via args or detect recent queued)
JOBS=("${@}")

if [[ ${#JOBS[@]} -eq 0 ]]; then
  echo "[jira-annotate] No job IDs supplied; skipping portal links in comment." >&2
fi

comment_body="RPS batch queued via portal."
if [[ ${#JOBS[@]} -gt 0 ]]; then
  comment_body+="\n\nPortal job links:"; for j in "${JOBS[@]}"; do comment_body+="\n- http://localhost:3000/admin/dashboard/tasks/${j}"; done
fi

# Find latest Epic with summary containing RPS FastAPI
EPIC_KEY=$(curl "${HDR[@]}" "${BASE}/rest/api/3/search?jql=project=${PROJECT_KEY}+AND+issuetype=Epic+AND+summary~%22RPS%22+ORDER+BY+created+DESC&maxResults=1" | jq -r '.issues[0].key // empty')
if [[ -z "$EPIC_KEY" ]]; then
  echo "[jira-annotate] No matching Epic found; aborting." >&2
  exit 0
fi
echo "[jira-annotate] Epic: $EPIC_KEY"

# Get child tasks linked to Epic (team-managed uses parent link)
TASK_KEYS=$(curl "${HDR[@]}" "${BASE}/rest/api/3/search?jql=project=${PROJECT_KEY}+AND+parent=${EPIC_KEY}+ORDER+BY+created+ASC&maxResults=20" | jq -r '.issues[].key')

# Add comment to Epic and each task
add_comment(){
  local key="$1"; shift
  local body="$1"; shift
  local payload=$(jq -n --arg t "$body" '{body:$t}')
  curl "${HDR[@]}" -X POST "${BASE}/rest/api/3/issue/${key}/comment" -d "$payload" >/dev/null
  echo "[jira-annotate] Commented: ${key}"
}

add_comment "$EPIC_KEY" "$comment_body"
for k in ${TASK_KEYS}; do add_comment "$k" "$comment_body"; done

# Transition tasks to In Progress if available
for k in ${TASK_KEYS}; do
  TRANS_ID=$(curl "${HDR[@]}" "${BASE}/rest/api/3/issue/${k}/transitions" | jq -r '.transitions[] | select(.name=="In Progress") | .id' | head -n1)
  if [[ -n "$TRANS_ID" ]]; then
    curl "${HDR[@]}" -X POST "${BASE}/rest/api/3/issue/${k}/transitions" -d "{\"transition\":{\"id\":\"${TRANS_ID}\"}}" >/dev/null
    echo "[jira-annotate] Moved ${k} → In Progress"
  else
    echo "[jira-annotate] No 'In Progress' transition for ${k}; skipped"
  fi
done

echo "[jira-annotate] Done."

