#!/usr/bin/env bash
set -euo pipefail

# jira-create-project.sh — Create Jira Software project AVNZ (Scrum template)
# WARNING: Requires Jira admin permissions. Creates a new project if it does not exist.

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
PROJECT_NAME="Avnz App"
PROJECT_TYPE="software"
TEMPLATE_KEY="com.pyxis.greenhopper.jira:gh-simplified-agility-scrum"

curl_get() { curl -sS -f "${HDR[@]}" "$@"; }
curl_post() { curl -sS -f "${HDR[@]}" -X POST "$@"; }
log() { echo "[jira-create] $*"; }

project_exists() {
  curl_get "${BASE}/rest/api/3/project/${PROJECT_KEY}" >/dev/null 2>&1
}

myself_account_id() {
  curl_get "${BASE}/rest/api/3/myself" | jq -r '.accountId'
}

create_project() {
  local lead_id="$1"
  local payload
  payload=$(jq -nc \
    --arg key "$PROJECT_KEY" \
    --arg name "$PROJECT_NAME" \
    --arg lead "$lead_id" \
    --arg ptype "$PROJECT_TYPE" \
    --arg tmpl "$TEMPLATE_KEY" \
    '{key:$key,name:$name,leadAccountId:$lead,projectTypeKey:$ptype,projectTemplateKey:$tmpl}')
  curl_post "${BASE}/rest/api/3/project" -d "$payload" | jq .
}

main() {
  if project_exists; then
    log "Project ${PROJECT_KEY} already exists"
    exit 0
  fi
  local lead
  lead=$(myself_account_id)
  if [[ -z "$lead" || "$lead" == "null" ]]; then
    echo "Could not resolve current user accountId" >&2; exit 1
  fi
  log "Creating project ${PROJECT_KEY} (${PROJECT_NAME}) with lead ${lead}"
  create_project "$lead"
}

main "$@"
