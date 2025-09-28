#!/usr/bin/env bash
set -euo pipefail
echo "[api-test] Templates E2E"
docker compose exec -T api sh -lc "node /app/test/templates-integration.mjs"
echo "[api-test] Templates E2E done"

