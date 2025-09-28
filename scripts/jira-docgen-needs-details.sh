#!/usr/bin/env bash
set -euo pipefail

# jira-docgen-needs-details.sh — Requeue docgen for In Progress issues labeled needs-details
# Also covers any In Progress issues still missing required sections/placeholders (belt-and-suspenders).

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

# JQL: explicit needs-details label
JQL1='project = AVNZ AND status = "In Progress" AND labels = needs-details'
DATA1=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL1}" --data-urlencode "fields=key,summary,description,labels" --data-urlencode "maxResults=500")

# JQL: general In Progress (we will filter missing details client-side just in case)
JQL2='project = AVNZ AND status = "In Progress"'
DATA2=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL2}" --data-urlencode "fields=key,summary,description,labels" --data-urlencode "maxResults=500")

echo "[docgen-needs] Scanning In Progress issues…"

filter_missing='.
  | .issues[]
  | { key: .key, summary: .fields.summary, desc: (.fields.description // ""), labels: (.fields.labels // []) }
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

NEEDS1=$(printf '%s' "$DATA1" | jq -r '.issues[] | [.key, .fields.summary] | @tsv')
NEEDS2=$(printf '%s' "$DATA2" | jq -r "$filter_missing | [.key, .summary] | @tsv")

# Merge unique keys
merged=$(printf '%s\n%s\n' "$NEEDS1" "$NEEDS2" | awk -F"\t" 'NF{ a[$1]=$0 } END{ for(k in a) print a[k] }')

count=$(printf '%s\n' "$merged" | grep -c . || true)
echo "[docgen-needs] Found ${count} issues needing tailored details"

queued=0
printf '%s\n' "$merged" | while IFS=$'\t' read -r KEY SUMM; do
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
- Epic Goal, Scope & Out of Scope, Deliverables, Milestones, Success Metrics, Stakeholders & Dependencies, Risks & Assumptions, Definition of Done.
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
  echo "[docgen-needs] queue $KEY"
  docker compose exec -T web sh -lc "curl -sS -H 'content-type: application/json' -X POST -d '$PAYLOAD' http://localhost:3000/api/agents/jobs" >/dev/null || true
  queued=$((queued+1))
done

echo "[docgen-needs] Queued docgen for ${count} issue(s)"

exit 0
