#!/usr/bin/env bash
set -euo pipefail

echo "[lint] Checking containers..."
if docker compose ps >/dev/null 2>&1; then
  RUN_WEB="docker compose exec -T web sh -lc"
  RUN_API="docker compose exec -T api sh -lc"
else
  RUN_WEB=""
  RUN_API=""
fi

STATUS=$(docker compose ps --services --status=running 2>/dev/null || true)

if echo "$STATUS" | grep -q "web" && echo "$STATUS" | grep -q "api"; then
  echo "[lint] Running ESLint in web container..."
  $RUN_WEB "npm run -s lint"
  echo "[lint] Running ESLint in api container..."
  $RUN_API "npm run -s lint"
  echo "[lint] OK: both services linted"
  exit 0
fi

echo "[lint] Containers not running. Attempting host lint as fallback..."
FAILED=0
if [ -f apps/web/package.json ]; then
  (cd apps/web && npx -y eslint 'app/**/*.{ts,tsx}' || FAILED=1)
fi
if [ -f apps/api/package.json ]; then
  (cd apps/api && npx -y eslint 'src/**/*.{ts,tsx}' || FAILED=1)
fi

if [ "$FAILED" -ne 0 ]; then
  echo "[lint] Issues found. Start containers and rerun: docker compose up -d web api && bash scripts/lint.sh" >&2
  exit 1
fi
echo "[lint] OK: fallback host lint passed"

