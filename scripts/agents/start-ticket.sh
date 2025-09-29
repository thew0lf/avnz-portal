#!/usr/bin/env bash
set -euo pipefail

# Start bot work on a Jira ticket by constructing a task prompt
# and invoking the AI orchestrator inside the ai container.
#
# Usage: scripts/agents/start-ticket.sh AVNZ-123
#
# Requires: docker, docker compose; optional JIRA_* envs to auto-fetch issue.

KEY=${1:-}
if [[ -z "$KEY" ]]; then
  echo "Usage: $0 AVNZ-###" >&2
  exit 2
fi

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2; exit 1
fi

TITLE=""
DESC=""

if [[ -n "${JIRA_EMAIL:-}" && -n "${JIRA_API_TOKEN:-}" && -n "${JIRA_DOMAIN:-}" ]]; then
  BASE="https://${JIRA_DOMAIN}"
  AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
  HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)
  JSON=$(curl "${HDR[@]}" "$BASE/rest/api/3/issue/${KEY}") || JSON=""
  if [[ -n "$JSON" ]]; then
    TITLE=$(printf '%s' "$JSON" | jq -r '.fields.summary // empty')
    # Extract minimal plaintext from ADF/HTML-ish description if present
    DESC=$(printf '%s' "$JSON" | jq -r '.fields.description | if type=="object" and .content then (.content[]?.content[]?.text // "") else . // "" end' | tr -d '\r')
  fi
fi

if [[ -z "$TITLE" ]]; then
  TITLE="Implement $KEY per repo conventions"
fi

read -r -d '' TASK <<EOF || true
Ticket: ${KEY}
Title: ${TITLE}

Repository conventions:
- Read SUMMARY.MD and AGENTS.md end-to-end before coding.
- Follow RBAC, soft-delete, admin UI SPA patterns, and design gate.
- Use migrations under db/init for schema changes.
- Update SUMMARY.MD after substantive changes.
- Branch naming: design-2/AVNZ-10/${KEY}
- Commit messages must start with "${KEY}: ...".

If the ticket lacks detail, draft Context, User Story, Acceptance Criteria, and Testing & QA first.
Then implement the smallest vertical slice and validate via health/smoke/walkthrough.
EOF

echo "[bots] Starting orchestrator for ${KEY}..." >&2
docker compose exec -e OPENAI_API_KEY -e ASSISTANTS_MODEL -T ai sh -lc "python -m app.assistants.orchestrator --task \"${TASK}\""

