#!/usr/bin/env bash
set -euo pipefail

# jira-board-verify-columns.sh — Verify AVNZ board has required columns
# Required columns: To Do, In Progress, In Review, QA Testing, Blocked, Done

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
BOARD_NAME="AVNZ Scrum"
REQ_COLUMNS=("To Do" "In Progress" "In Review" "QA Testing" "Blocked" "Done")

curl_get() { curl -sS -f "${HDR[@]}" "$@"; }
log() { echo "[jira-columns] $*"; }

get_board_id() {
  # Prefer named board (Scrum), else any board in project
  local id
  id=$(curl_get "${BASE}/rest/agile/1.0/board?projectKeyOrId=${PROJECT_KEY}" | jq -r --arg n "$BOARD_NAME" '.values[] | select(.name==$n) | .id' | head -n1)
  if [[ -n "$id" && "$id" != "null" ]]; then echo "$id"; return; fi
  id=$(curl_get "${BASE}/rest/agile/1.0/board?projectKeyOrId=${PROJECT_KEY}" | jq -r '.values[0].id // empty')
  echo "$id"
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

verify_columns() {
  local bid="$1"
  local cfg col_lines missing=()
  cfg=$(curl_get "${BASE}/rest/agile/1.0/board/${bid}/configuration" || echo '{}')
  col_lines=$(echo "$cfg" | jq -r '.columnConfig.columns[].name')
  log "Found columns: $(echo "$col_lines" | xargs)"
  for want in "${REQ_COLUMNS[@]}"; do
    if echo "$col_lines" | grep -Fxq "$want"; then
      :
    else
      missing+=("$want")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Missing columns: ${missing[*]}"; return 2
  fi
  echo "All required columns present."
}

main() {
  local bid
  resolve_project_key || true
  bid=$(get_board_id)
  if [[ -z "$bid" || "$bid" == "null" ]]; then
    echo "No Scrum board found for project ${PROJECT_KEY}" >&2
    exit 1
  fi
  log "Using board #${bid}"
  verify_columns "$bid"
}

main "$@"
