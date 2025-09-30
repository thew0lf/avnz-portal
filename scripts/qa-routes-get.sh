#!/usr/bin/env bash
set -euo pipefail

# Smoke test: enumerate GET routes and assert they don't 5xx when called.
# - Requires API_BASE (default http://localhost:3001)
# - For authenticated routes, set QA_TOKEN (JWT). For admin routes requiring nodeId, set ORG_UUID.
# - Prints any non-2xx/401/403 responses and exits 1 if any 5xx.

API_BASE=${API_BASE:-http://localhost:3001}
QA_TOKEN=${QA_TOKEN:-}
ORG_UUID=${ORG_UUID:-}

hdr=(-sS -H 'accept: application/json')
if [[ -n "$QA_TOKEN" ]]; then hdr+=(-H "authorization: Bearer ${QA_TOKEN}"); fi

# Fetch route registry via admin endpoint (requires token and nodeId)
if [[ -z "$QA_TOKEN" || -z "$ORG_UUID" ]]; then
  echo "[warn] QA_TOKEN or ORG_UUID not set; will only probe public routes (e.g., /health)" >&2
  ROUTES=("/health")
else
  data=$(curl -sS -H "authorization: Bearer ${QA_TOKEN}" "${API_BASE}/admin/routes?nodeId=${ORG_UUID}&include_deleted=0" || true)
  # Extract GET paths, skip dynamic params
  ROUTES=( $(printf '%s' "$data" | jq -r '.rows[] | select(.method=="GET") | .path' | grep -v ':') )
  # Ensure /health included
  ROUTES+=("/health")
fi

echo "[qa] Probing ${#ROUTES[@]} GET routes on ${API_BASE}"
errors=0
for p in "${ROUTES[@]}"; do
  url="${API_BASE}${p}"
  # Append nodeId for admin routes if missing
  if [[ "$p" == /admin/* && -n "$ORG_UUID" && "$p" != *"nodeId="* ]]; then
    sep='?'; [[ "$p" == *"?"* ]] && sep='&'
    url="${API_BASE}${p}${sep}nodeId=${ORG_UUID}"
  fi
  code=$(curl "${hdr[@]}" -o /dev/null -w '%{http_code}' "$url" || true)
  case "$code" in
    200|204|401|403) echo "[ok] $code $p";;
    404) echo "[warn] $code $p";;
    *) echo "[err] $code $p"; errors=$((errors+1));;
  esac
done

if (( errors > 0 )); then
  echo "[qa] FAIL: ${errors} route(s) returned error codes. Please file Jira bugs."
  exit 1
else
  echo "[qa] PASS: routes returned expected codes"
fi

