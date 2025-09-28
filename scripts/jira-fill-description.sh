#!/usr/bin/env bash
set -euo pipefail

# jira-fill-description.sh — Ensure tickets have a full ADF Description with required sections
# Usage:
#   scripts/jira-fill-description.sh 'project = AVNZ AND statusCategory != Done'

JQL_IN="${1:-project = AVNZ AND statusCategory != Done}"

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

HDR_JSON=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" -sS)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

echo "[fill] Searching issues…"
ISSUES=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL_IN}" --data-urlencode "fields=key,description,priority,labels" --data-urlencode "maxResults=500" | jq -r '.issues[] | [.key, (.fields.description|tostring)] | @tsv')

make_adf() {
  python3 - <<'PY'
import json,sys
def para(t):
  return {"type":"paragraph","content":[{"type":"text","text":t}]}
sections = [
  ("Context","- Provide a 2-3 sentence problem statement."),
  ("User Story","- As a <role>, I want <capability>, so that <benefit>."),
  ("Acceptance Criteria","- [ ] Criteria 1\n- [ ] Criteria 2\n- [ ] Criteria 3"),
  ("Definition of Done","- Code merged, tests passing, docs updated, toggles/metrics as needed."),
  ("Implementation Guide","- Code pointers, endpoints, migrations, flags."),
  ("Testing & QA Details","- Unit/integration tests and manual steps."),
  ("Risk & Rollback","- Risks and rollback steps."),
]
content = []
for title,body in sections:
  content.append({"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":title}]})
  for line in body.split("\n"):
    content.append(para(line))
doc = {"type":"doc","version":1,"content":content}
print(json.dumps({"fields":{"description":doc,"labels":["auto-briefed"]}}))
PY
}

updated=0
while IFS=$'\t' read -r KEY DESC; do
  [[ -z "$KEY" ]] && continue
  NEED=0
  if [[ "$DESC" == "null" || -z "$DESC" ]]; then NEED=1; fi
  if [[ $NEED -eq 0 ]]; then
    echo "$DESC" | grep -qi 'Context' || NEED=1
    echo "$DESC" | grep -qi 'User Story' || NEED=1
    echo "$DESC" | grep -qi 'Acceptance Criteria' || NEED=1
    (echo "$DESC" | grep -qi 'Testing & QA' || echo "$DESC" | grep -qi 'Testing & QA Details') || NEED=1
  fi
  if [[ $NEED -eq 1 ]]; then
    if [[ "$DESC" == "null" || -z "$DESC" ]]; then
      echo "[fill] $KEY setting baseline ADF description (empty)"
      PAYLOAD=$(make_adf)
      curl "${HDR_JSON[@]}" -X PUT "${BASE}/rest/api/3/issue/${KEY}" -d "$PAYLOAD" >/dev/null || true
      updated=$((updated+1))
    else
      echo "[fill] $KEY posting needs-details reminder (do not overwrite existing description)"
      MSG=$(python3 - <<'PY'
import json
body = {"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Please tailor the description with Context, User Story, Acceptance Criteria, and Testing & QA details (no placeholders)."}]}]}}
print(json.dumps(body))
PY
)
      curl "${HDR_JSON[@]}" -X POST "${BASE}/rest/api/3/issue/${KEY}/comment" -d "$MSG" >/dev/null || true
      curl "${HDR_JSON[@]}" -X PUT "${BASE}/rest/api/3/issue/${KEY}" -d '{"update":{"labels":[{"add":"needs-details"}]}}' >/dev/null || true
    fi
  else
    echo "[ok] $KEY description already contains required sections"
  fi
done < <(printf '%s\n' "$ISSUES")

echo "[fill] Completed. Updated=$updated"
