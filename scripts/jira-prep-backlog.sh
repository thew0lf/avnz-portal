#!/usr/bin/env bash
set -euo pipefail

# jira-prep-backlog.sh — Normalize a backlog before automation/processing
# 1) Validates Description for required sections and adds an ADF auto-brief comment + needs-details label if missing
# 2) Sets a default Priority when missing/Lowest
# 3) Optional: runs backfill to queue In Progress items
#
# Usage:
#   scripts/jira-prep-backlog.sh 'project = AVNZ AND statusCategory != Done' Medium --backfill

JQL_IN="${1:-project = AVNZ AND statusCategory != Done}"
DEFAULT_PRIORITY="${2:-Medium}"
DO_BACKFILL="${3:-}"

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

echo "[prep] Validate & Enrich"
bash "$ROOT_DIR/scripts/jira-validate-and-enrich.sh" "$JQL_IN"

echo "[prep] Set default priority where missing/Lowest -> $DEFAULT_PRIORITY"
bash "$ROOT_DIR/scripts/jira-set-default-priority.sh" "$JQL_IN" "$DEFAULT_PRIORITY"

if [[ "$DO_BACKFILL" == "--backfill" ]]; then
  echo "[prep] Trigger backfill to queue In Progress items"
  TOK=$(rg -n '^SERVICE_TOKEN=' -S "$ROOT_DIR/.env" | sed -E 's/.*=//')
  curl -sS -H "x-service-token: $TOK" -X POST http://localhost:3001/jira/backfill | jq .
fi

echo "[prep] Done"

