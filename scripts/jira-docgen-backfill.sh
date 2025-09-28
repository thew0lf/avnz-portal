#!/usr/bin/env bash
set -euo pipefail

# jira-docgen-backfill.sh — Queue docgen jobs for In Progress issues missing tailored details
# Detects issues that either:
#  - lack one of the required sections (Context, User Story, Acceptance Criteria, Testing & QA)
#  - or contain placeholder boilerplate (e.g., "As a <role>")
# Then queues docgen jobs via the portal tasks API so the AI worker updates the Jira description (ADF) and labels.

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

JQL_IN="${1:-project = AVNZ AND status = \"In Progress\"}"

echo "[docgen-backfill] Searching issues…"
DATA=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL_IN}" --data-urlencode "fields=key,summary,description" --data-urlencode "maxResults=500")

COUNT=$(printf '%s' "$DATA" | jq -r '.issues | length')
echo "[docgen-backfill] Found ${COUNT} In Progress issues"

filter_script='.
  | .issues[]
  | { key: .key, summary: .fields.summary, desc: (.fields.description // "") }
  | select(
      (
        (.desc | tostring | contains("Context") | not) or
        (.desc | tostring | contains("User Story") | not) or
        (.desc | tostring | contains("Acceptance Criteria") | not) or
        (.desc | tostring | (contains("Testing & QA") or contains("Testing & QA Details")) | not)
      ) or (
        (.desc | tostring | test("As a <role>|<capability>|<benefit>|Criteria 1|Criteria 2|Criteria 3|Provide a 2-3 sentence"; "i"))
      )
    )'

NEEDS=$(printf '%s' "$DATA" | jq -r "$filter_script | [.key, .summary] | @tsv")

if [[ -z "$NEEDS" ]]; then
  echo "[docgen-backfill] No issues need docgen"
  exit 0
fi

while IFS=$'\t' read -r KEY SUMM; do
  [[ -z "$KEY" ]] && continue
  DETAILS=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/issue/${KEY}" --data-urlencode "fields=summary,description,components,labels,issuetype,priority" | jq -r '{summary:.fields.summary, description:(.fields.description//""), components:(.fields.components//[]|map(.name)|join(", ")), labels:(.fields.labels//[]|join(", ")), type:(.fields.issuetype.name//""), priority:(.fields.priority.name//"")} | @json')
  PAYLOAD=$(KEY="$KEY" SUMM="$SUMM" DETAILS="$DETAILS" python3 - <<'PY'
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
- Scope: included; Out of Scope: excluded.
- Deliverables: endpoints/pages/scripts/docs.
- Milestones: key checkpoints.
- Success Metrics: objective measures for success.
- Stakeholders & Dependencies.
- Risks & Assumptions.
- Definition of Done.
""".strip()
else:
    task = f"""
You are writing a ticket-specific description for Jira issue {os.environ['KEY']} in the avnz-portal project.

Context:
- Summary: {summary}
- Current description: {desc[:1200]}
- Type: {itype}; Priority: {pri}; Components: {components}; Labels: {labels}

Write ONLY specific, actionable content; no placeholders. Produce sections:
- Context (2–3 sentence), User Story (concrete), Acceptance Criteria (checklist), Testing & QA Details (unit/integration + manual).
- Implementation Guidance (optional): code paths/endpoints/migrations/flags.
""".strip()
print(json.dumps({"task": task, "meta": {"jira_issue_key": os.environ['KEY'], "docgen": True}}))
PY
)
  echo "[docgen-backfill] queue $KEY"
  docker compose exec -T web sh -lc "curl -sS -H 'content-type: application/json' -X POST -d '$PAYLOAD' http://localhost:3000/api/agents/jobs" | jq . >/dev/null || true
done < <(printf '%s\n' "$NEEDS")

echo "[docgen-backfill] Done"
