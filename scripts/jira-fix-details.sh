#!/usr/bin/env bash
set -euo pipefail

# Posts a structured content scaffold comment to a Jira issue to help satisfy
# the portal's description requirements. Does NOT overwrite description.

KEY=${1:-}
if [[ -z "$KEY" ]]; then echo "Usage: $0 AVNZ-###" >&2; exit 2; fi

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env" 2>/dev/null || true; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

read -r -d '' BODY <<'JSON' || true
{
  "body": {
    "type": "doc",
    "version": 1,
    "content": [
      {"type":"paragraph","content":[{"type":"text","text":"Please add the required sections below with ticket-specific details (no placeholders):"}]},
      {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Context"}]},
      {"type":"paragraph","content":[{"type":"text","text":"Explain the problem and background in 2–3 sentences."}]},
      {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"User Story"}]},
      {"type":"paragraph","content":[{"type":"text","text":"As a <role>, I want <capability>, so that <benefit>."}]},
      {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Acceptance Criteria"}]},
      {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Criterion 1"}]}]}]}
      ,{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Testing & QA"}]},
      {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Unit tests added/updated"}]}]}]}
    ]
  }
}
JSON

curl -sS -f -H "Authorization: Basic ${AUTH_B64}" -H 'Content-Type: application/json' \
  -X POST "${BASE}/rest/api/3/issue/${KEY}/comment" --data "$BODY" >/dev/null
echo "[fix-details] Posted scaffold comment to ${KEY}"

