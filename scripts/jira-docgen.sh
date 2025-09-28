#!/usr/bin/env bash
set -euo pipefail

# jira-docgen.sh — Generate ticket-specific Jira descriptions via the portal worker
# Usage:
#   scripts/jira-docgen.sh 'project = AVNZ AND statusCategory != Done'

JQL_IN="${1:-project = AVNZ AND statusCategory != Done}"

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

echo "[docgen] Searching issues…"
ISSUES=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL_IN}" --data-urlencode "fields=key,summary" --data-urlencode "maxResults=500" | jq -r '.issues[] | [.key, .fields.summary] | @tsv')

if [[ -z "$ISSUES" ]]; then
  echo "[docgen] No matching issues"
  exit 0
fi

while IFS=$'\t' read -r KEY SUMM; do
  [[ -z "$KEY" ]] && continue
  # Fetch more fields for context
  DETAILS=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/issue/${KEY}" --data-urlencode "fields=summary,description,components,labels,issuetype,priority" | jq -r '{summary:.fields.summary, description:(.fields.description//""), components:(.fields.components//[]|map(.name)|join(", ")), labels:(.fields.labels//[]|join(", ")), type:(.fields.issuetype.name//""), priority:(.fields.priority.name//"")} | @json')
  TASK=$(KEY="$KEY" SUMM="$SUMM" DETAILS="$DETAILS" python3 - <<'PY'
import json, os
d = json.loads(os.environ['DETAILS'])
summary = d.get('summary') or os.environ['SUMM']
desc = d.get('description') or ''
if not isinstance(desc, str):
    try:
        desc = json.dumps(desc, ensure_ascii=False)
    except Exception:
        desc = ''
components = d.get('components') or ''
labels = d.get('labels') or ''
itype = d.get('type') or ''
pri = d.get('priority') or ''
if itype.lower() == 'epic':
    task = f"""
You are writing an EPIC description for Jira issue {os.environ['KEY']} (avnz-portal).

Context:
- Summary: {summary}
- Current description: {desc[:1200]}
- Priority: {pri}; Components: {components}; Labels: {labels}

Write ONLY specific, actionable content for this EPIC; no placeholders. Produce these EPIC sections:
- Epic Goal: clear outcome and why it matters.
- Scope: what is included; Out of Scope: what is explicitly excluded.
- Deliverables: concrete artifacts (endpoints, pages, scripts, docs).
- Milestones: key checkpoints/timeboxes.
- Success Metrics: objective measures to declare the epic successful.
- Stakeholders & Dependencies.
- Risks & Assumptions.
- Definition of Done: what must be true to close the epic.

If a detail is unknown, omit it—do not invent.
""".strip()
else:
    task = f"""
You are writing a ticket-specific description for Jira issue {os.environ['KEY']} in the avnz-portal project.

Context:
- Summary: {summary}
- Current description: {desc[:1200]}
- Type: {itype}; Priority: {pri}; Components: {components}; Labels: {labels}

Write ONLY specific, actionable content; no placeholders or boilerplate. Produce sections:
- Context: 2–3 sentence, ticket-specific problem statement.
- User Story: "As a <actual role>, I want <capability>, so that <benefit>" with concrete values (no angle brackets).
- Acceptance Criteria: checklist tailored to this ticket.
- Testing & QA Details: unit/integration ideas and manual validation steps.
- Implementation Guidance (optional): code paths, endpoints, migrations, flags.

If a detail is unknown, omit it—do not invent or use placeholders.
""".strip()
print(json.dumps({"task": task, "meta": {"jira_issue_key": os.environ['KEY'], "docgen": True}}))
PY
)
  PAYLOAD=$(KEY="$KEY" TASK="$TASK" python3 - <<PY
import json,os,sys
task = os.environ['TASK']
key = os.environ['KEY']
print(json.dumps({"task": task, "meta": {"jira_issue_key": key, "docgen": True}}))
PY
)
  echo "[docgen] queue $KEY"
  docker compose exec -T web sh -lc "curl -sS -H 'content-type: application/json' -X POST -d '$PAYLOAD' http://localhost:3000/api/agents/jobs" | jq .
done < <(printf '%s\n' "$ISSUES")

echo "[docgen] Done"
