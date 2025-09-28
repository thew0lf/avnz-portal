#!/usr/bin/env bash
set -euo pipefail

# confluence-bootstrap.sh — Brave Mode automation for Confluence setup
# - Creates space AVNZ (name: Avnz App) if missing
# - Creates initial page tree under space home
# Notes: Requires Confluence admin API access; permissions updates best-effort.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}/wiki"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

SPACE_KEY="AVNZ"
SPACE_NAME="Avnz App"
GROUP_NAME="avnz-app-team"

log() { echo "[conf] $*"; }

curl_get() { curl -sS -f "${HDR[@]}" "$@"; }
curl_post() { curl -sS -f "${HDR[@]}" -X POST "$@"; }

space_exists() {
  curl_get "${BASE}/rest/api/space?keys=${SPACE_KEY}&expand=homepage" | jq -e '.results | length > 0' >/dev/null
}

ensure_space() {
  if space_exists; then
    log "Space ${SPACE_KEY} exists"
  else
    log "Creating space ${SPACE_KEY} (${SPACE_NAME})"
    curl_post "${BASE}/rest/api/space" -d "{\"key\":\"${SPACE_KEY}\",\"name\":\"${SPACE_NAME}\"}" >/dev/null
  fi
}

get_homepage_id() {
  curl_get "${BASE}/rest/api/space/${SPACE_KEY}?expand=homepage" | jq -r '.homepage.id'
}

create_page() {
  local title="$1"; shift
  local content="$1"; shift
  local parent_id="$1"; shift || true
  local data
  if [[ -n "${parent_id:-}" ]]; then
    data=$(jq -nc --arg t "$title" --arg c "$content" --arg p "$parent_id" '{type:"page", title:$t, space:{key:"'"${SPACE_KEY}"'"}, ancestors:[{id:($p|tonumber)}], body:{storage:{value:$c, representation:"storage"}}}')
  else
    data=$(jq -nc --arg t "$title" --arg c "$content" '{type:"page", title:$t, space:{key:"'"${SPACE_KEY}"'"}, body:{storage:{value:$c, representation:"storage"}}}')
  fi
  curl_post "${BASE}/rest/api/content" -d "$data" | jq -r '.id'
}

best_effort_permissions() {
  # Best-effort: grant read/edit to group if API supports it
  # If this fails, continue silently.
  local payload
  payload=$(jq -nc --arg g "$GROUP_NAME" '{subjects:{group:[{name:$g}]},
    operations:[{key:"read"},{key:"edit"}] }')
  curl -sS -f "${HDR[@]}" -X POST "${BASE}/rest/api/space/${SPACE_KEY}/permission" -d "$payload" >/dev/null || true
}

ensure_space

HOME_ID=$(get_homepage_id)
log "Space home id: ${HOME_ID}"

# Create initial page tree
ROSTER_HTML='<table><tbody>
<tr><th>Name</th><th>Role</th><th>Email</th></tr>
<tr><td>Emma Johansson</td><td>Product Manager</td><td>emma.johansson@avnz.io</td></tr>
<tr><td>Raj Patel</td><td>Scrum Master</td><td>raj.patel@avnz.io</td></tr>
<tr><td>Lucas Meyer</td><td>Senior Developer / Tech Lead</td><td>lucas.meyer@avnz.io</td></tr>
<tr><td>Carlos Hernández</td><td>Mid-Level Developer</td><td>carlos.hernandez@avnz.io</td></tr>
<tr><td>Sophia Li</td><td>Mid-Level Developer</td><td>sophia.li@avnz.io</td></tr>
<tr><td>David O’Connor</td><td>Mid-Level Developer</td><td>david.oconnor@avnz.io</td></tr>
<tr><td>Aisha Khan</td><td>Junior Developer</td><td>aisha.khan@avnz.io</td></tr>
<tr><td>Mateo Rossi</td><td>Junior Developer</td><td>mateo.rossi@avnz.io</td></tr>
<tr><td>Hannah Wright</td><td>Junior Developer</td><td>hannah.wright@avnz.io</td></tr>
<tr><td>Nguyen Minh</td><td>Junior Developer</td><td>nguyen.minh@avnz.io</td></tr>
<tr><td>Olivia Brown</td><td>DevOps Engineer</td><td>olivia.brown@avnz.io</td></tr>
<tr><td>Fatima El-Sayed</td><td>Senior QA Manager</td><td>fatima.elsayed@avnz.io</td></tr>
<tr><td>Daniel Kim</td><td>QA Analyst</td><td>daniel.kim@avnz.io</td></tr>
<tr><td>Laura Silva</td><td>QA Analyst</td><td>laura.silva@avnz.io</td></tr>
<tr><td>Michael Carter</td><td>QA Analyst</td><td>michael.carter@avnz.io</td></tr>
<tr><td>Anastasia Petrov</td><td>Automation QA Engineer</td><td>anastasia.petrov@avnz.io</td></tr>
</tbody></table>'

create_page "Team Roster & Responsibilities" "$ROSTER_HTML" "$HOME_ID" >/dev/null || true

create_page "Product" "<p>Roadmap, requirements, and backlog grooming.</p>" "$HOME_ID" >/dev/null || true
create_page "Development" "<p>Architecture, API docs, coding standards, CI/CD.</p>" "$HOME_ID" >/dev/null || true
create_page "QA" "<p>Test plans, regression checklists, and triage process.</p>" "$HOME_ID" >/dev/null || true
create_page "DevOps" "<p>Infrastructure, monitoring, alerts, and security.</p>" "$HOME_ID" >/dev/null || true
create_page "Meetings" "<p>Sprint planning, stand-ups, and retrospectives.</p>" "$HOME_ID" >/dev/null || true

# Create a Jira issues page with a macro embedding AVNZ issues
JIRA_MACRO='<ac:structured-macro ac:name="jira"><ac:parameter ac:name="jqlQuery">project = AVNZ ORDER BY created DESC</ac:parameter></ac:structured-macro>'
create_page "Jira Epics & Stories" "$JIRA_MACRO" "$HOME_ID" >/dev/null || true

best_effort_permissions

log "Done: space ensured, starter pages created"
