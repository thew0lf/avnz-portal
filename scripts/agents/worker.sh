#!/usr/bin/env bash
set -euo pipefail
echo "[agents] starting worker in ai container"
docker compose exec -e OPENAI_API_KEY -e ASSISTANTS_MODEL -e REDIS_URL -T ai sh -lc "python -m app.assistants.worker"

