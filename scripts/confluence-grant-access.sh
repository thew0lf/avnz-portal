#!/usr/bin/env bash
set -euo pipefail

# confluence-grant-access.sh — Preview/apply space permissions for selected users
# Usage:
#   scripts/confluence-grant-access.sh [--apply] [--space AVNZ] [--csv scripts/confluence-access.csv]
# CSV format: email,permission  (permission: read|edit)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env"; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

APPLY=false
SPACE_KEY="AVNZ"
CSV_PATH="${SCRIPT_DIR}/confluence-access.csv"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true; shift ;;
    --space) SPACE_KEY="$2"; shift 2 ;;
    --csv)   CSV_PATH="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

BASE_JIRA="https://${JIRA_DOMAIN}"
BASE_CONF="https://${JIRA_DOMAIN}/wiki"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

log() { echo "[conf-access] $*"; }

urlenc() { python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$1"; }

user_lookup() {
  local email="$1"
  curl -sS -f "${HDR[@]}" "${BASE_JIRA}/rest/api/3/user/search?query=$(urlenc "$email")"
}

get_space_permissions() {
  curl -sS -f "${HDR[@]}" "${BASE_CONF}/rest/api/space/${SPACE_KEY}/permission"
}

grant_permissions() {
  local accountId="$1"; shift
  local perm="$1"; shift
  local ops
  if [[ "$perm" == "edit" ]]; then ops='[{"key":"read"},{"key":"edit"}]'; else ops='[{"key":"read"}]'; fi
  local payload
  payload=$(jq -nc --arg id "$accountId" --argjson ops "$ops" '{subjects:{user:[{accountId:$id}]}, operations:$ops}')
  curl -sS -f "${HDR[@]}" -X POST "${BASE_CONF}/rest/api/space/${SPACE_KEY}/permission" -d "$payload" >/dev/null
}

ensure_group_membership() {
  local accountId="$1"; shift
  local groupName="confluence-users"
  # Resolve groupId, then add by groupId (avoids 410 on name-based endpoint)
  local gid
  gid=$(curl -sS -f "${HDR[@]}" "${BASE_CONF}/rest/api/group/by-name?name=$(urlenc "$groupName")" | jq -r '.id // empty' || true)
  if [[ -n "$gid" ]]; then
    curl -sS -f "${HDR[@]}" -X POST \
      "${BASE_CONF}/rest/api/group/user?groupId=${gid}" \
      -d "{\"accountId\":\"$accountId\"}" >/dev/null || true
  else
    # Fallback to name-based add
    curl -sS -f "${HDR[@]}" -X POST \
      "${BASE_CONF}/rest/api/group/user?name=$(urlenc "$groupName")" \
      -d "{\"accountId\":\"$accountId\"}" >/dev/null || true
  fi
  # Final fallback: try Jira group endpoint
  curl -sS -f "${HDR[@]}" -X POST \
    "${BASE_JIRA}/rest/api/3/group/user?groupname=$(urlenc "$groupName")" \
    -d "{\"accountId\":\"$accountId\"}" >/dev/null || true
}

log "Verifying space ${SPACE_KEY}"
SKIP_SPACE=false
if ! curl -sS -f "${HDR[@]}" "${BASE_CONF}/rest/api/space/${SPACE_KEY}?expand=homepage" >/dev/null 2>&1; then
  log "WARN: Space ${SPACE_KEY} not found or no access; will grant group access only"
  SKIP_SPACE=true
fi

if [[ ! -f "$CSV_PATH" ]]; then
  cat > "$CSV_PATH" <<CSV
emma.johansson@avnz.io,edit
raj.patel@avnz.io,edit
lucas.meyer@avnz.io,edit
fatima.elsayed@avnz.io,read
CSV
  log "Created default CSV at $CSV_PATH. Review and rerun."
fi

log "Fetching current space permissions"
PERMS_JSON=$(get_space_permissions || echo '[]')

printf "\n[conf-access] Preview (users missing access)\n"
missing_any=false
declare -a TO_APPLY_IDS=()
declare -a TO_APPLY_PERMS=()

while IFS=, read -r email perm || [[ -n "${email:-}" ]]; do
  [[ -z "${email:-}" || -z "${perm:-}" ]] && continue
  email=$(echo "$email" | xargs); perm=$(echo "$perm" | xargs)
  resp=$(user_lookup "$email" || echo '[]')
  accId=$(echo "$resp" | jq -r '.[0].accountId // empty')
  name=$(echo "$resp" | jq -r '.[0].displayName // empty')
  if [[ -z "$accId" ]]; then
    echo "- $email -> NOT FOUND in Atlassian directory"
    continue
  fi
  has_read=$(echo "$PERMS_JSON" | jq -e --arg id "$accId" '.[] | select(.subjects.user[]?.accountId==$id) | .operations[]?.key | select(.=="read")' >/dev/null && echo yes || echo no)
  has_edit=$(echo "$PERMS_JSON" | jq -e --arg id "$accId" '.[] | select(.subjects.user[]?.accountId==$id) | .operations[]?.key | select(.=="edit")' >/dev/null && echo yes || echo no)
  need=false
  if [[ "$perm" == "edit" && ( "$has_edit" != yes ) ]]; then need=true; fi
  if [[ "$perm" == "read" && ( "$has_read" != yes ) ]]; then need=true; fi
  if [[ "$need" == true ]]; then
    echo "- $email ($name, $accId) MISSING $perm"
    missing_any=true
    TO_APPLY_IDS+=("$accId"); TO_APPLY_PERMS+=("$perm")
  else
    echo "- $email ($name, $accId) already has required access"
  fi
done < "$CSV_PATH"

if [[ "$APPLY" == true ]]; then
  log "Applying access for ${#TO_APPLY_IDS[@]} users"
  for i in "${!TO_APPLY_IDS[@]}"; do
    accId="${TO_APPLY_IDS[$i]}"; perm="${TO_APPLY_PERMS[$i]}"
    ensure_group_membership "$accId"
    if [[ "$SKIP_SPACE" == true ]]; then
      log "Granted group access to $accId (space ${SPACE_KEY} unavailable)"
    else
      if grant_permissions "$accId" "$perm"; then
        log "Granted group access + $perm on space to $accId"
      else
        log "WARN: Failed granting space perm $perm to $accId (group membership applied)"
      fi
    fi
  done
else
  log "Preview only. Re-run with --apply to grant."
fi
