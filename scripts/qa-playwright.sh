#!/usr/bin/env bash
set -euo pipefail

# Run Playwright tests inside the web container (CI/dev helper)
# Requires docker and compose services running.

echo "[qa] Running Playwright tests in web container..."
docker compose exec -T web sh -lc '
  set -e
  cd /app
  npm i
  npx playwright install --with-deps
  npx playwright test --reporter=line --browser=chromium
'

echo "[qa] Playwright run complete."

