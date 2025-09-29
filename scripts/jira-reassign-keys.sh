#!/usr/bin/env bash
set -euo pipefail

# Reassign a list of Jira issues to a round‑robin of assignees based on phase lists.
# Usage:
#   bash scripts/jira-reassign-keys.sh dev AVNZ-10 AVNZ-11 AVNZ-12
# Phases: dev|review|qa|test|audit

PHASE=${1:-}
shift || true
if [[ -z "$PHASE" || $# -lt 1 ]]; then
  echo "Usage: $0 <dev|review|qa|test|audit> KEY [KEY...]" >&2
  exit 2
fi

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env" 2>/dev/null || true; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Accept: application/json" -H "Content-Type: application/json")

case "$PHASE" in
  dev)    LIST_VAR="JIRA_ASSIGNEE_DEV_LIST" ;;
  review) LIST_VAR="JIRA_ASSIGNEE_REVIEW_LIST" ;;
  qa)     LIST_VAR="JIRA_ASSIGNEE_QA_LIST" ;;
  test)   LIST_VAR="JIRA_ASSIGNEE_TEST_LIST" ;;
  audit)  LIST_VAR="JIRA_ASSIGNEE_AUDIT_LIST" ;;
  *) echo "Unknown phase: $PHASE" >&2; exit 2;;
esac

RAW_LIST=${!LIST_VAR:-}
if [[ -z "$RAW_LIST" ]]; then
  echo "[$PHASE] No assignees configured in env var $LIST_VAR" >&2
  exit 1
fi

# Normalize list: separate by comma/semicolon/newline; strip titles after '|'
IFS=$'\n' read -r -d '' -a NAMES < <(printf '%s' "$RAW_LIST" | tr ';,' '\n' | sed 's/|.*$//' | sed 's/^\s*//;s/\s*$//' | awk 'NF' && printf '\0')
if (( ${#NAMES[@]} == 0 )); then echo "[$PHASE] No assignees parsed" >&2; exit 1; fi

rr=0
for KEY in "$@"; do
  NAME="${NAMES[$(( rr % ${#NAMES[@]} ))]}"; rr=$(( rr + 1 ))
  # Resolve accountId by displayName search
  RESP=$(curl -sS -f "${HDR[@]}" "${BASE}/rest/api/3/user/search?query=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$NAME")" || true)
  ACCT=$(printf '%s' "$RESP" | jq -r '.[0].accountId // empty')
  if [[ -z "$ACCT" || "$ACCT" == "null" ]]; then
    echo "[skip] ${KEY}: cannot resolve accountId for '${NAME}'" >&2
    continue
  fi
  # Assign
  RES=$(curl -sS -o /dev/null -w "%{http_code}" "${HDR[@]}" -X PUT "${BASE}/rest/api/3/issue/${KEY}/assignee" --data "{\"accountId\":\"$ACCT\"}") || RES=0
  if [[ "$RES" == "204" ]]; then
    echo "[assign] ${KEY} -> ${NAME}"
  else
    echo "[assign-failed] ${KEY} http=$RES" >&2
  fi
done

