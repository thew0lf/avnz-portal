#!/usr/bin/env bash
set -euo pipefail

# Validate tickets for required content and enrich with an ADF comment when missing. Optionally set default priority.
# Usage:
#   scripts/jira-validate-and-enrich.sh 'project = AVNZ AND statusCategory != Done'

JQL_IN="${1:-project = AVNZ AND statusCategory != Done}"

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

ADF=$(python3 - <<'PY'
import json
text = (
"Auto-brief:\n\nContext\n- Provide a 2-3 sentence problem statement.\n\nUser Story\n- As a <role>, I want <capability>, so that <benefit>.\n\nAcceptance Criteria\n- [ ] Criteria 1\n- [ ] Criteria 2\n- [ ] Criteria 3\n\nDefinition of Done\n- Code merged, tests passing, docs updated, toggles/metrics as needed.\n\nImplementation Guide\n- Code pointers, endpoints, migrations, flags.\n\nTesting & QA Details\n- Unit/integration tests and manual steps.\n\nRisk & Rollback\n- Risks and rollback steps."
)
content = [{"type":"paragraph","content":[{"type":"text","text":line}]} for line in text.split("\n")] 
body = {"body":{"type":"doc","version":1,"content":content}}
print(json.dumps(body))
PY
)

echo "[validate] Searching issues…"
ISSUES=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL_IN}" --data-urlencode "fields=key,description,priority,labels" --data-urlencode "maxResults=500" | jq -r '.issues[] | [.key, (.fields.description|tostring), (.fields.priority.name // ""), ((.fields.labels // [])|join(","))] | @tsv')

while IFS=$'\t' read -r KEY DESC PRI LABELS; do
  [[ -z "$KEY" ]] && continue
  need_context=$(echo "$DESC" | grep -qi 'Context' || true; [[ $? -ne 0 ]] && echo 1 || echo 0)
  need_story=$(echo "$DESC" | grep -qi 'User Story' || true; [[ $? -ne 0 ]] && echo 1 || echo 0)
  need_ac=$(echo "$DESC" | grep -qi 'Acceptance Criteria' || true; [[ $? -ne 0 ]] && echo 1 || echo 0)
  need_qa=$(echo "$DESC" | grep -qi 'Testing & QA' || echo "$DESC" | grep -qi 'Testing & QA Details' || true; [[ $? -ne 0 ]] && echo 1 || echo 0)
  if [[ "$need_context$need_story$need_ac$need_qa" != "0000" ]]; then
    echo "[enrich] $KEY add ADF comment and needs-details label"
    curl -sS -H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -X POST "${BASE}/rest/api/3/issue/${KEY}/comment" -d "$ADF" >/dev/null || true
    # add label
    curl -sS -H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -X PUT "${BASE}/rest/api/3/issue/${KEY}" -d '{"update":{"labels":[{"add":"needs-details"}]}}' >/dev/null || true
  else
    echo "[ok] $KEY description contains required sections"
  fi
  if [[ -z "$PRI" || "$PRI" == "Lowest" ]]; then
    echo "[priority] $KEY -> Medium"
    curl -sS -H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -X PUT "${BASE}/rest/api/3/issue/${KEY}" -d '{"fields":{"priority":{"name":"Medium"}}}' >/dev/null || true
  fi
done < <(printf '%s\n' "$ISSUES")

echo "[validate] Done"

