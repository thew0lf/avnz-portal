#!/usr/bin/env bash
set -euo pipefail

# confluence-needs-access.sh — Show which users (from CSV) lack Confluence basic access
# Usage: scripts/confluence-needs-access.sh [--csv scripts/confluence-access.csv]
# CSV format: email,permission  (permission ignored for this check)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env"; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

CSV_PATH="${SCRIPT_DIR}/confluence-access.csv"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --csv) CSV_PATH="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

BASE_JIRA="https://${JIRA_DOMAIN}"
BASE_CONF="https://${JIRA_DOMAIN}/wiki"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

# Curl safety defaults
: "${CURL_CONNECT_TIMEOUT:=5}"
: "${CURL_MAX_TIME:=20}"
: "${CURL_RETRIES:=2}"
curl_q() {
  curl -sS \
    --connect-timeout "$CURL_CONNECT_TIMEOUT" \
    --max-time "$CURL_MAX_TIME" \
    --retry "$CURL_RETRIES" \
    "$@"
}

urlenc() { python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$1"; }

user_lookup() {
  local email="$1"
  curl_q -f "${HDR[@]}" "${BASE_JIRA}/rest/api/3/user/search?query=$(urlenc "$email")"
}

# Build set of accountIds in confluence-users group (use Jira directory API)
declare -a CONF_USER_IDS=()
startAt=0; maxResults=50; page=0; max_pages=200
while :; do
  ((page++))
  if (( page > max_pages )); then
    echo "[confluence-needs] Reached page limit (${max_pages}); stopping to avoid hang" >&2
    break
  fi
  resp=$(curl_q -H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" \
    "${BASE_JIRA}/rest/api/3/group/member?groupname=$(urlenc \"confluence-users\")&startAt=${startAt}&maxResults=${maxResults}" || true)
  [[ -z "$resp" ]] && break
  ids=$(echo "$resp" | jq -r '.values[]?.accountId')
  if [[ -n "$ids" ]]; then
    while IFS= read -r id; do CONF_USER_IDS+=("$id"); done <<< "$ids"
  fi
  total=$(echo "$resp" | jq -r '.total // empty')
  values_len=$(echo "$resp" | jq -r '.values | length')
  if [[ -n "$total" && "$total" != "null" ]]; then
    if (( startAt + maxResults >= total )); then break; fi
  else
    # Fallback: break when an empty page is returned
    if [[ "$values_len" == "0" ]]; then break; fi
  fi
  startAt=$((startAt+maxResults))
done

in_conf_users() {
  local id="$1"
  for x in "${CONF_USER_IDS[@]:-}"; do [[ "$x" == "$id" ]] && return 0; done
  return 1
}

echo "[confluence-needs] Checking users from ${CSV_PATH} against confluence-users group"
printf "%-35s %-40s %s\n" "Email" "DisplayName" "Needs Access?"
printf "%-35s %-40s %s\n" "-----" "-----------" "-------------"

while IFS=, read -r email perm || [[ -n "${email:-}" ]]; do
  [[ -z "${email:-}" ]] && continue
  email=$(echo "$email" | xargs)
  resp=$(user_lookup "$email" || echo '[]')
  accId=$(echo "$resp" | jq -r '.[0].accountId // empty')
  name=$(echo "$resp" | jq -r '.[0].displayName // empty')
  if [[ -z "$accId" ]]; then
    printf "%-35s %-40s %s\n" "$email" "(not found)" "YES (no Atlassian user)"
    continue
  fi
  if in_conf_users "$accId"; then
    printf "%-35s %-40s %s\n" "$email" "$name" "no"
  else
    printf "%-35s %-40s %s\n" "$email" "$name" "YES"
  fi
done < "$CSV_PATH"
