#!/usr/bin/env bash
set -euo pipefail

# jira-bootstrap.sh — Brave Mode automation for Jira setup
# - Creates group `avnz-app-team` if missing
# - Looks up users by email and adds them to the group
# - Assigns project roles in project `AVNZ` based on roster
# Notes: Requires Jira admin API access; does not create users or workflows.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present (without echoing secrets)
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

PROJECT_KEY="AVNZ"
GROUP_NAME="avnz-app-team"

log() { echo "[jira] $*"; }

curl_get() {
  curl -sS -f "${HDR[@]}" "$@"
}

curl_post() {
  curl -sS -f "${HDR[@]}" -X POST "$@"
}

# Roster definitions (email buckets)
ADMIN_EMAILS=(
  "emma.johansson@avnz.io"
  "raj.patel@avnz.io"
)
DEV_EMAILS=(
  "lucas.meyer@avnz.io"
  "carlos.hernandez@avnz.io"
  "sophia.li@avnz.io"
  "david.oconnor@avnz.io"
  "aisha.khan@avnz.io"
  "mateo.rossi@avnz.io"
  "hannah.wright@avnz.io"
  "nguyen.minh@avnz.io"
  "olivia.brown@avnz.io"
)
QA_EMAILS=(
  "fatima.elsayed@avnz.io"
  "daniel.kim@avnz.io"
  "laura.silva@avnz.io"
  "michael.carter@avnz.io"
  "anastasia.petrov@avnz.io"
)

# Display names for invites/creation
get_name_for_email() {
  case "$1" in
    "emma.johansson@avnz.io") echo "Emma Johansson" ;;
    "raj.patel@avnz.io") echo "Raj Patel" ;;
    "lucas.meyer@avnz.io") echo "Lucas Meyer" ;;
    "carlos.hernandez@avnz.io") echo "Carlos Hernández" ;;
    "sophia.li@avnz.io") echo "Sophia Li" ;;
    "david.oconnor@avnz.io") echo "David O’Connor" ;;
    "aisha.khan@avnz.io") echo "Aisha Khan" ;;
    "mateo.rossi@avnz.io") echo "Mateo Rossi" ;;
    "hannah.wright@avnz.io") echo "Hannah Wright" ;;
    "nguyen.minh@avnz.io") echo "Nguyen Minh" ;;
    "olivia.brown@avnz.io") echo "Olivia Brown" ;;
    "fatima.elsayed@avnz.io") echo "Fatima El-Sayed" ;;
    "daniel.kim@avnz.io") echo "Daniel Kim" ;;
    "laura.silva@avnz.io") echo "Laura Silva" ;;
    "michael.carter@avnz.io") echo "Michael Carter" ;;
    "anastasia.petrov@avnz.io") echo "Anastasia Petrov" ;;
    *) echo "$1" ;;
  esac
}

urlencode() {
  python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$1"
}

user_search_by_email() {
  local email="$1"
  local q
  q=$(urlencode "$email")
  curl_get "${BASE}/rest/api/3/user/search?query=${q}"
}

# Best-effort user creation/invitation (Atlassian Cloud may require admin scopes)
ensure_user_exists() {
  local email="$1"; local name="$2"
  local resp accId
  resp=$(user_search_by_email "$email" || echo '[]')
  accId=$(echo "$resp" | jq -r '.[0].accountId // empty')
  if [[ -n "$accId" ]]; then
    echo "$accId"
    return 0
  fi
  log "Creating/inviting user ${email}"
  # Try create via Jira Cloud REST (best-effort). applicationKeys varies; jira-software is common.
  local payload
  payload=$(jq -nc --arg em "$email" --arg dn "$name" '{emailAddress:$em, displayName:$dn, products:["jira-software"]}')
  if curl_post "${BASE}/rest/api/3/user" -d "$payload" >/dev/null 2>&1; then
    :
  else
    # Fallback: try without applicationKeys
    payload=$(jq -nc --arg em "$email" --arg dn "$name" '{emailAddress:$em, displayName:$dn}')
    curl_post "${BASE}/rest/api/3/user" -d "$payload" >/dev/null 2>&1 || true
  fi
  # Re-resolve accountId
  sleep 1
  resp=$(user_search_by_email "$email" || echo '[]')
  accId=$(echo "$resp" | jq -r '.[0].accountId // empty')
  echo "$accId"
}

ensure_group() {
  log "Ensuring group ${GROUP_NAME} exists"
  if curl_get "${BASE}/rest/api/3/groups/picker?query=$(urlencode "${GROUP_NAME}")" | jq -e ".groups[] | select(.name==\"${GROUP_NAME}\")" >/dev/null; then
    log "Group ${GROUP_NAME} exists"
  else
    curl_post "${BASE}/rest/api/3/group" -d "{\"name\":\"${GROUP_NAME}\"}" >/dev/null || log "Group create: may already exist or insufficient scope; continuing"
  fi
}

add_user_to_group() {
  local account_id="$1"
  curl_post "${BASE}/rest/api/3/group/user?groupname=$(urlencode "${GROUP_NAME}")" -d "{\"accountId\":\"${account_id}\"}" >/dev/null || true
}

declare -a ADMINS=()
declare -a DEVS=()
declare -a QAS=()

resolve_and_enroll_users() {
  log "Resolving users and adding to ${GROUP_NAME}"
  for email in "${ADMIN_EMAILS[@]}"; do
    accId=$(ensure_user_exists "$email" "$(get_name_for_email "$email")" || true)
    if [[ -n "${accId:-}" && "$accId" != "null" ]]; then add_user_to_group "$accId"; ADMINS+=("$accId"); else log "WARN: Could not create/resolve $email"; fi
  done
  for email in "${DEV_EMAILS[@]}"; do
    accId=$(ensure_user_exists "$email" "$(get_name_for_email "$email")" || true)
    if [[ -n "${accId:-}" && "$accId" != "null" ]]; then add_user_to_group "$accId"; DEVS+=("$accId"); else log "WARN: Could not create/resolve $email"; fi
  done
  for email in "${QA_EMAILS[@]}"; do
    accId=$(ensure_user_exists "$email" "$(get_name_for_email "$email")" || true)
    if [[ -n "${accId:-}" && "$accId" != "null" ]]; then add_user_to_group "$accId"; QAS+=("$accId"); else log "WARN: Could not create/resolve $email"; fi
  done
}

# Resolve project key if the project named "AVNZ" exists under a different key
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

get_role_url_by_name() {
  local name="$1"
  curl_get "${BASE}/rest/api/3/project/${PROJECT_KEY}/role" | jq -r --arg n "$name" 'to_entries[] | select(.key==$n) | .value'
}

# Auto-detect project roles for admin/dev/qa buckets
detect_roles() {
  local roles_json
  roles_json=$(curl_get "${BASE}/rest/api/3/project/${PROJECT_KEY}/role" || echo '{}')
  ROLE_ADMIN=$(echo "$roles_json" | jq -r 'to_entries[] | select(.key|test("(?i)admin")) | .key' | head -n1)
  ROLE_DEV=$(echo "$roles_json" | jq -r 'to_entries[] | select(.key|test("(?i)developer|member")) | .key' | head -n1)
  ROLE_QA=$(echo "$roles_json" | jq -r 'to_entries[] | select(.key|test("(?i)qa|test|quality|viewer")) | .key' | head -n1)
  [[ -z "${ROLE_ADMIN:-}" || "${ROLE_ADMIN}" == "null" ]] && ROLE_ADMIN=""
  [[ -z "${ROLE_DEV:-}" || "${ROLE_DEV}" == "null" ]] && ROLE_DEV=""
  [[ -z "${ROLE_QA:-}" || "${ROLE_QA}" == "null" ]] && ROLE_QA=""
  log "Detected roles -> admin:'${ROLE_ADMIN:-}' dev:'${ROLE_DEV:-}' qa:'${ROLE_QA:-}'"
}

assign_role_users() {
  local role_name="$1"; shift
  local -a ids=("${@}")
  if [[ ${#ids[@]} -eq 0 ]]; then
    log "No users to assign for role ${role_name}"
    return 0
  fi
  role_url=$(get_role_url_by_name "$role_name" || true)
  if [[ -z "$role_url" || "$role_url" == "null" ]]; then
    log "WARN: Project role ${role_name} not found in ${PROJECT_KEY}; skipping"
    return 0
  fi
  # Assign one-by-one so we can treat "already a member" as OK
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
      log "WARN: Assign $accId to ${role_name} failed (HTTP $http)"
    fi
  done
}

# Replace placeholders in subshell python invocations
ensure_group
resolve_project_key || true
detect_roles
resolve_and_enroll_users

log "Assigning project roles in ${PROJECT_KEY}"
if [[ -n "${ROLE_ADMIN}" ]]; then assign_role_users "${ROLE_ADMIN}" "${ADMINS[@]:-}"; else log "WARN: No admin-like role detected"; fi
if [[ -n "${ROLE_DEV}" ]]; then assign_role_users "${ROLE_DEV}"   "${DEVS[@]:-}";   else log "WARN: No developer-like role detected"; fi
if [[ -n "${ROLE_QA}" ]]; then assign_role_users "${ROLE_QA}"     "${QAS[@]:-}";    else log "WARN: No QA/viewer-like role detected"; fi

log "Done: group ensured, users added where found, roles assigned when available"
