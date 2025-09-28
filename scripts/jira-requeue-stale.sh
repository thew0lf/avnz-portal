#!/usr/bin/env bash
set -euo pipefail

# jira-requeue-stale.sh — Requeue bot work for stale issues
# Default JQL: project = AVNZ AND statusCategory != Done AND updated <= -30m
# Maps Jira status → phase: In Progress→dev, In Review→review, QA Testing→qa

MINS="${1:-30}"
JQL_IN="${2:-project = AVNZ AND statusCategory != Done AND updated <= -${MINS}m}"

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -sS)

echo "[stale] Query: ${JQL_IN}"
DATA=$(curl "${HDR[@]}" -G "${BASE}/rest/api/3/search" --data-urlencode "jql=${JQL_IN}" --data-urlencode "fields=key,status,assignee,summary,updated" --data-urlencode "maxResults=200")
COUNT=$(printf '%s' "$DATA" | jq -r '.issues | length')
echo "[stale] Found ${COUNT} issues"

queue_one(){
  local key="$1"; local phase="$2"; local task
  task="[${phase^^} Jira ${key}] Re-run phase ${phase} for stale issue ${key}."
  curl -sS -H 'content-type: application/json' -X POST -d "{\"task\":$(jq -nc --arg t "$task" '$t'),\"meta\":{\"jira_issue_key\":\"$key\",\"phase\":\"$phase\"}}" http://localhost:3000/api/agents/jobs >/dev/null || true
  echo "[stale] queued ${key} phase=${phase}"
}

printf '%s' "$DATA" | jq -r '.issues[] | [.key, .fields.status.name] | @tsv' | while IFS=$'\t' read -r KEY STATUS; do
  [[ -z "$KEY" ]] && continue
  s=$(echo "$STATUS" | tr '[:upper:]' '[:lower:]')
  phase=""
  case "$s" in
    in\ progress) phase=dev ;;
    in\ review) phase=review ;;
    qa\ testing) phase=qa ;;
    blocked) phase=dev ;;
    *) phase="" ;;
  esac
  [[ -z "$phase" ]] && { echo "[stale] skip ${KEY} status=${STATUS}"; continue; }
  queue_one "$KEY" "$phase"
done

echo "[stale] Done"

