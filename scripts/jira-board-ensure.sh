#!/usr/bin/env bash
set -euo pipefail

# jira-board-ensure.sh — Ensure AVNZ board + filter exist; print config
# - Ensures a filter "AVNZ Board Filter" with JQL: project = AVNZ ORDER BY Rank ASC
# - Ensures a Scrum board named "AVNZ Scrum" bound to that filter
# - Prints board configuration (columns/status mapping) for review

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
FILTER_NAME="AVNZ Board Filter"
BOARD_NAME="AVNZ Scrum"

log() { echo "[jira-board] $*" >&2; }

curl_get() { curl -sS -f "${HDR[@]}" "$@"; }
curl_post() { curl -sS -f "${HDR[@]}" -X POST "$@"; }

get_project_id() {
  curl_get "${BASE}/rest/api/3/project/${PROJECT_KEY}" | jq -r '.id'
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

ensure_filter() {
  local filter_id
  filter_id=$(curl_get "${BASE}/rest/api/3/filter/search?filterName=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("${FILTER_NAME}"))')" | jq -r '.values[] | select(.name=="'"${FILTER_NAME}"'") | .id' | head -n1)
  local jql="project = ${PROJECT_KEY} ORDER BY Rank ASC"
  if [[ -n "${filter_id}" && "${filter_id}" != "null" ]]; then
    log "Filter exists: ${FILTER_NAME} (#${filter_id})"
    echo "$filter_id"
    return 0
  fi
  log "Creating filter: ${FILTER_NAME}"
  local payload
  payload=$(jq -nc --arg name "$FILTER_NAME" --arg jql "$jql" '{name:$name, jql:$jql, favourite:true}')
  filter_id=$(curl_post "${BASE}/rest/api/3/filter" -d "$payload" | jq -r '.id')
  echo "$filter_id"
}

ensure_board() {
  local filter_id="$1"
  local existing_id
  existing_id=$(curl_get "${BASE}/rest/agile/1.0/board?projectKeyOrId=${PROJECT_KEY}&type=scrum" | jq -r --arg n "$BOARD_NAME" '.values[] | select(.name==$n) | .id' | head -n1 || true)
  if [[ -n "${existing_id}" && "${existing_id}" != "null" ]]; then
    log "Board exists: ${BOARD_NAME} (#${existing_id})"
    echo "$existing_id"
    return 0
  fi
  log "Creating Scrum board: ${BOARD_NAME}"
  local payload
  payload=$(jq -nc --arg name "$BOARD_NAME" --arg fid "$filter_id" '{name:$name, type:"scrum", filterId:($fid|tonumber)}')
  local id
  id=$(curl_post "${BASE}/rest/agile/1.0/board" -d "$payload" | jq -r '.id')
  echo "$id"
}

print_board_config() {
  local board_id="$1"
  log "Board configuration for #${board_id}:"
  curl_get "${BASE}/rest/agile/1.0/board/${board_id}/configuration" | jq . || true
}

main() {
  local pid fid bid
  pid=$(get_project_id)
  if [[ -z "${pid}" || "${pid}" == "null" ]]; then
    echo "Failed to resolve project ${PROJECT_KEY}" >&2; exit 1
  fi
  log "Project ${PROJECT_KEY} id=${pid}"
  fid=$(ensure_filter)
  if [[ -z "${fid}" || "${fid}" == "null" ]]; then
    echo "Failed to ensure filter" >&2; exit 1
  fi
  bid=$(ensure_board "$fid")
  if [[ -z "${bid}" || "${bid}" == "null" ]]; then
    echo "Failed to ensure board" >&2; exit 1
  fi
  print_board_config "$bid"
  cat <<NOTE
---
Note: Jira Cloud's public APIs do not support programmatic updates to board columns/status mappings.
Ensure columns include: To Do, In Progress, In Review, QA Testing, Blocked, Done,
and map the corresponding statuses in the board settings UI. This script prints the current config for review.
NOTE
}

main "$@"
