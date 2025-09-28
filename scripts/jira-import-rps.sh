#!/usr/bin/env bash
set -euo pipefail

# Creates an Epic and child Tasks for the RPS work described in RPS_TASK.md
# Requirements: JIRA_EMAIL, JIRA_API_TOKEN, JIRA_DOMAIN; optional PROJECT_KEY (default AVNZ)

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

PROJECT_KEY="${PROJECT_KEY:-AVNZ}"
BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

hdr=( -H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -sS )

log(){ echo "[jira-import-rps] $*"; }

jqval(){ jq -r "$1" 2>/dev/null; }

# Resolve Emma Johansson accountId
log "Resolving assignee accountId for Emma Johansson"
ASSIGNEE_ID=$(curl "${hdr[@]}" \
  "${BASE}/rest/api/3/user/search?query=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("Emma Johansson"))')" | jq -r '.[0].accountId // empty')
if [[ -z "$ASSIGNEE_ID" ]]; then
  # fallback: try username handle
  ASSIGNEE_ID=$(curl "${hdr[@]}" "${BASE}/rest/api/3/user/search?query=emma.johansson" | jq -r '.[0].accountId // empty')
fi
if [[ -z "$ASSIGNEE_ID" ]]; then
  log "WARN: Could not resolve Emma accountId; tasks will be unassigned."
fi

# Discover field ids for Epic Name and Epic Link if present
FIELDS_JSON=$(curl "${hdr[@]}" "${BASE}/rest/api/3/field")
EPIC_LINK_FIELD=$(jq -r '.[] | select(.name=="Epic Link") | .id' <<<"$FIELDS_JSON" | head -n1)

# Resolve reporter (current user)
REPORTER_ID=$(curl "${hdr[@]}" "${BASE}/rest/api/3/myself" | jq -r '.accountId')

# Create Epic
EPIC_SUMMARY="RPS FastAPI CSV & Web Proxies"
EPIC_DESC=""

log "Creating Epic: $EPIC_SUMMARY"
# Resolve project id
PROJ_JSON=$(curl "${hdr[@]}" "${BASE}/rest/api/3/project/${PROJECT_KEY}")
PROJECT_ID=$(jq -r '.id' <<<"$PROJ_JSON")
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  log "ERROR: Cannot resolve project id for $PROJECT_KEY"; exit 1
fi

EPIC_FIELDS=$(jq -n --arg projId "$PROJECT_ID" --arg sum "$EPIC_SUMMARY" --arg rep "$REPORTER_ID" \
  '{project:{id:$projId},summary:$sum,issuetype:{name:"Epic"},reporter:{accountId:$rep}}')
EPIC_RES=$(jq -n --argjson f "$EPIC_FIELDS" '{fields:$f}' | curl "${hdr[@]}" -X POST "${BASE}/rest/api/3/issue" -d @-)
EPIC_KEY=$(jq -r '.key // empty' <<<"$EPIC_RES")
if [[ -z "$EPIC_KEY" ]]; then
  log "ERROR: Failed to create Epic. Response: $EPIC_RES"; exit 1
fi
log "Epic created: $EPIC_KEY"

# Helper to build child issue payload
mk_issue(){
  local summary="$1"; shift
  local description="$1"; shift # kept for logging but not sent due to ADF enforcement
  local components_csv="$1"; shift
  local labels_csv="$1"; shift

  local labels_json
  if [[ -n "$labels_csv" ]]; then
    labels_json=$(jq -n --argjson arr "[$(printf '"%s"' ${labels_csv//,/","})]" '$arr')
  else
    labels_json='[]'
  fi

  local base
  base=$(jq -n --arg projId "$PROJECT_ID" --arg sum "$summary" --arg rep "$REPORTER_ID" \
      --argjson labels "$labels_json" \
      '{project:{id:$projId},issuetype:{name:"Task"},summary:$sum,labels:$labels,reporter:{accountId:$rep}}')
  if [[ -n "$ASSIGNEE_ID" ]]; then
    base=$(jq --arg acct "$ASSIGNEE_ID" '. + {assignee:{accountId:$acct}}' <<<"$base")
  fi
  base=$(jq --arg ekey "$EPIC_KEY" '. + {parent:{key:$ekey}}' <<<"$base")
  echo "$base"
}

create_issue(){
  local payload="$1"; shift
  local res
  res=$(jq -n --argjson f "$payload" '{fields:$f}' | curl "${hdr[@]}" -X POST "${BASE}/rest/api/3/issue" -d @-)
  local key
  key=$(jq -r '.key // empty' <<<"$res")
  if [[ -z "$key" ]]; then
    log "ERROR creating issue: $res"; return 1
  fi
  echo "$key"
}

created_keys=("$EPIC_KEY")

# Define tasks
add_task(){
  local s="$1"; shift
  local d="$1"; shift
  local comps="$1"; shift
  local labels="$1"; shift
  local payload
  payload=$(mk_issue "$s" "$d" "$comps" "$labels")
  local key
  key=$(create_issue "$payload") || exit 1
  log "Created: $key — $s"
  created_keys+=("$key")
}

add_task "AI: Add ?format=csv for Orders/Customers/Transactions" \
         "Add CSV support to apps/ai/app/rps/router.py with proper content-type, auth, and input bounds." \
         "AI" \
         "rps,autogen,codex,brave-mode"

add_task "Web: RPS API proxies (orders/customers/transactions)" \
         "Create/update Next.js API routes: app/api/rps/orders, app/api/rps/orders/[id], app/api/rps/customers, app/api/rps/transactions; implement JWT with refresh fallback." \
         "Web" \
         "rps,autogen,codex,brave-mode"

add_task "Web: Admin UI pages for RPS" \
         "Add admin pages and table components: app/admin/dashboard/rps (overview), orders, customers, transactions; match Clients page scaffolding and shadcn patterns." \
         "Web" \
         "rps,autogen,codex,brave-mode"

add_task "Scripts: rps smoke test" \
         "Add scripts/rps/smoke.sh to verify 401 unauthenticated, CSV export from ai:/rps/orders?format=csv, and probe web:/api/rps/orders." \
         "Ops" \
         "rps,autogen,codex,brave-mode"

add_task "Docs: Update SUMMARY.MD for RPS work" \
         "Document files touched, endpoints added, and any env/secret expectations after RPS implementation." \
         "Docs" \
         "rps,autogen,codex,brave-mode"

log "Done. Created issues: ${created_keys[*]}"
