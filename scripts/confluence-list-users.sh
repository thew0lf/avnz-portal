#!/usr/bin/env bash
set -euo pipefail

# confluence-list-users.sh — List Confluence groups and members (best-effort)
# Usage: scripts/confluence-list-users.sh [groupName]
# If groupName omitted, lists core groups and members: confluence-users, confluence-administrators

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then set -a; source "$ROOT_DIR/.env"; set +a; fi

: "${JIRA_EMAIL:?JIRA_EMAIL is required}"
: "${JIRA_API_TOKEN:?JIRA_API_TOKEN is required}"
: "${JIRA_DOMAIN:?JIRA_DOMAIN is required}"

BASE="https://${JIRA_DOMAIN}/wiki"
AUTH_B64=$(printf '%s' "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
HDR=(-H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json")

GROUP="${1:-}"

list_group_members() {
  local name="$1"
  echo "\n[confluence-users] Group: $name"
  # Resolve groupId by name
  gid=$(curl -sS -f "${HDR[@]}" "${BASE}/rest/api/group/by-name?name=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$name")" | jq -r '.id // empty')
  if [[ -z "$gid" ]]; then echo "[confluence-users] Could not resolve groupId for $name"; return 1; fi
  # Fetch members (paginated)
  local start=0 limit=200 more=true
  while $more; do
    resp=$(curl -sS -f "${HDR[@]}" \
      "${BASE}/rest/api/group/member?groupId=${gid}&start=${start}&limit=${limit}")
    echo "$resp" | jq -r '.results[] | "- \(.displayName)\t\(.accountId)"'
    size=$(echo "$resp" | jq -r '.size')
    if [[ "$size" -lt "$limit" ]]; then more=false; else start=$((start+limit)); fi
  done
}

if [[ -n "$GROUP" ]]; then
  if ! list_group_members "$GROUP"; then
    echo "[confluence-users] Falling back to Jira directory API for group '$GROUP'"
    startAt=0; maxResults=50; more=true
    while $more; do
      resp=$(curl -sS -f -H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" \
        "https://${JIRA_DOMAIN}/rest/api/3/group/member?groupname=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$GROUP")&startAt=${startAt}&maxResults=${maxResults}") || break
      echo "$resp" | jq -r '.values[] | "- \(.displayName)\t\(.accountId)"'
      isLast=$(echo "$resp" | jq -r '.isLast')
      if [[ "$isLast" == "true" ]]; then more=false; else startAt=$((startAt+maxResults)); fi
    done
  fi
  exit 0
fi

echo "[confluence-users] Listing core groups"
for g in confluence-users confluence-administrators; do
  # Verify group exists
  if curl -sS -f "${HDR[@]}" "${BASE}/rest/api/group/by-name?name=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$g")" >/dev/null; then
    list_group_members "$g" || true
  else
    echo "[confluence-users] Group not found via Confluence API: $g — trying Jira directory API"
    startAt=0; maxResults=50; more=true
    while $more; do
      resp=$(curl -sS -f -H "Authorization: Basic ${AUTH_B64}" -H "Content-Type: application/json" \
        "https://${JIRA_DOMAIN}/rest/api/3/group/member?groupname=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$g")&startAt=${startAt}&maxResults=${maxResults}") || break
      echo "$resp" | jq -r '.values[] | "- \(.displayName)\t\(.accountId)"'
      isLast=$(echo "$resp" | jq -r '.isLast')
      if [[ "$isLast" == "true" ]]; then more=false; else startAt=$((startAt+maxResults)); fi
    done
  fi
done
