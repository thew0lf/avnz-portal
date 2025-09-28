#!/usr/bin/env bash
set -euo pipefail

# jira-verify-access.sh — Verify users, roles, and boards for AVNZ

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

PROJECT_KEY="AVNZ"
GROUP_NAME="avnz-app-team"

curl_get() { curl -sS -f "${HDR[@]}" "$@"; }
log() { echo "[jira-verify] $*"; }

urlenc() { python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$1"; }

list_group_members() {
  local startAt=0 max=50 total=0
  log "Group members in ${GROUP_NAME}:"
  while :; do
    local url
    url="${BASE}/rest/api/3/group/member?groupname=$(urlenc "$GROUP_NAME")&startAt=${startAt}&maxResults=${max}"
    resp=$(curl_get "$url" || echo '{}')
    echo "$resp" | jq -r '.values[] | "- \(.displayName) <\(.emailAddress // "n/a")> (\(.accountId))"'
    total=$(echo "$resp" | jq -r '.total // 0')
    startAt=$(( startAt + max ))
    [[ $startAt -ge $total ]] && break
  done
}

show_project_roles() {
  log "Project roles and actors for ${PROJECT_KEY}:"
  local roles
  roles=$(curl_get "${BASE}/rest/api/3/project/${PROJECT_KEY}/role" || echo '{}')
  echo "$roles" | jq -r 'to_entries[] | "ROLE: \(.key) -> \(.value)"'
  echo "$roles" | jq -r 'to_entries[].value' | while read -r roleUrl; do
    echo "--- $(basename "$roleUrl")"
    curl_get "$roleUrl" | jq -r '.name as $n | .actors[]? | "\($n): \(.displayName // .name) [\(.type)]"'
  done
}

list_boards() {
  log "Boards for project ${PROJECT_KEY}:"
  curl_get "${BASE}/rest/agile/1.0/board?projectKeyOrId=${PROJECT_KEY}" | jq -r '.values[] | "- #\(.id) \(.name) (\(.type))"'
}

resolve_project_key() {
  if curl_get "${BASE}/rest/api/3/project/${PROJECT_KEY}" >/dev/null 2>&1; then
    return 0
  fi
  local key
  key=$(curl_get "${BASE}/rest/api/3/project/search?query=${PROJECT_KEY}" | jq -r --arg n "$PROJECT_KEY" '.values[] | select(.name==$n) | .key' | head -n1 || true)
  if [[ -n "$key" && "$key" != "null" ]]; then
    log "Resolved project name '${PROJECT_KEY}' to key '${key}'"
    PROJECT_KEY="$key"
  else
    log "WARN: Could not resolve project '${PROJECT_KEY}' by name; continuing"
  fi
}

main() {
  list_group_members || true
  echo
  resolve_project_key || true
  show_project_roles || true
  echo
  list_boards || true
}

main "$@"
