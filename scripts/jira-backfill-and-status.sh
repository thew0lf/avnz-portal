#!/usr/bin/env bash
set -euo pipefail

# jira-backfill-and-status.sh — Trigger backfill and print current AI jobs status
# Usage:
#   scripts/jira-backfill-and-status.sh

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
TOK=$(rg -n '^SERVICE_TOKEN=' -S "$ROOT_DIR/.env" | sed -E 's/.*=//')

echo "[backfill] Trigger"
curl -sS -H "x-service-token: $TOK" -X POST http://localhost:3001/jira/backfill | jq .

echo "[status] AI jobs (top 20)"
docker compose exec -T aiworker python - <<'PY'
import json,urllib.request
with urllib.request.urlopen('http://ai:8000/agents/jobs?limit=20') as r:
    print(r.read().decode())
PY

echo "[status] Done"

