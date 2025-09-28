#!/usr/bin/env bash
set -euo pipefail
echo "[api-test] Admin access smoke"
docker compose exec -T api sh -lc "node /app/test/admin-access.mjs"
echo "[api-test] Admin access OK"

echo "[api-test] Soft-deletes E2E"
docker compose exec -T api sh -lc "node /app/test/soft-deletes.mjs"
echo "[api-test] Soft-deletes E2E done"
