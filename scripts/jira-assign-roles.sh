#!/usr/bin/env bash
set -euo pipefail

# Usage: jira-assign-roles.sh roster.csv [PROJECT_KEY]
# roster.csv: email,roleName[,displayName]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env"; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

ROSTER_CSV="${1:?CSV file required (email,roleName[,displayName])}"
PROJECT_KEY="${2:-AVNZ}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

log() { echo "[jira-assign] $*"; }

curl_get() { curl -sS -f "${HDR[@]}" "$@"; }
curl_post() { curl -sS -f "${HDR[@]}" -X POST "$@"; }

urlencode() { python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$1"; }

user_search_by_email() {
  local email="$1"
  curl_get "${BASE}/rest/api/3/user/search?query=$(urlencode "$email")"
}

ensure_user_exists() {
  local email="$1"; local name="$2"
  local resp accId
  resp=$(user_search_by_email "$email" || echo '[]')
  accId=$(echo "$resp" | jq -r '.[0].accountId // empty')
  if [[ -n "$accId" ]]; then echo "$accId"; return 0; fi
  log "Creating/inviting user ${email}"
  local payload
  payload=$(jq -nc --arg em "$email" --arg dn "$name" '{emailAddress:$em, displayName:$dn, products:["jira-software"]}')
  curl_post "${BASE}/rest/api/3/user" -d "$payload" >/dev/null 2>&1 || true
  sleep 1
  resp=$(user_search_by_email "$email" || echo '[]')
  accId=$(echo "$resp" | jq -r '.[0].accountId // empty')
  echo "$accId"
}

get_role_url_by_name() {
  local name="$1"
  curl_get "${BASE}/rest/api/3/project/${PROJECT_KEY}/role" | jq -r --arg n "$name" 'to_entries[] | select(.key==$n) | .value'
}

assign_role_users() {
  local role_name="$1"; shift
  local -a ids=("${@}")
  local role_url
  role_url=$(get_role_url_by_name "$role_name" || true)
  if [[ -z "$role_url" || "$role_url" == "null" ]]; then
    log "WARN: Role '${role_name}' not found in ${PROJECT_KEY}; skipping"
    return 0
  fi
  for accId in "${ids[@]}"; do
    local payload http body_file body
    payload=$(jq -nc --arg id "$accId" '{user:[$id]}')
    body_file=$(mktemp)
    http=$(curl -sS -o "$body_file" -w "%{http_code}" "${HDR[@]}" -X POST "$role_url" -d "$payload" || true)
    body=$(cat "$body_file" 2>/dev/null || true); rm -f "$body_file" || true
    if [[ "$http" == "200" || "$http" == "204" ]]; then
      log "Assigned $accId to role ${role_name}"
    elif [[ "$http" == "400" && "$body" == *"already a member"* ]]; then
      log "Already member: $accId in role ${role_name} (OK)"
    else
      log "WARN: Failed assigning ${role_name} (user $accId, HTTP $http)"
    fi
  done
}

while IFS=, read -r email role name || [[ -n "${email:-}" ]]; do
  [[ -z "${email:-}" || -z "${role:-}" ]] && continue
  email=$(echo "$email" | xargs)
  role=$(echo "$role" | xargs)
  name=$(echo "${name:-$email}" | xargs)
  accId=$(ensure_user_exists "$email" "$name" || true)
  if [[ -z "${accId:-}" || "$accId" == "null" ]]; then
    log "WARN: Could not create/resolve $email"; continue
  fi
  # Assign immediately to avoid needing associative arrays
  assign_role_users "$role" "$accId"
done < "$ROSTER_CSV"

log "Done."
