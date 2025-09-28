#!/usr/bin/env bash
set -euo pipefail

echo "[api-test] Running API integration tests against localhost:3001"
docker compose exec -T api sh -lc "node /app/test/run-integration-tests.mjs"
echo "[api-test] Done"

