#!/usr/bin/env bash
set -euo pipefail

TASK=${1:-}
if [ -z "${TASK}" ]; then
  echo "Usage: $0 \"Describe your task...\"" >&2
  exit 1
fi

echo "[agents] Running in ai container using ASSISTANTS_MODEL=${ASSISTANTS_MODEL:-gpt-4o-mini}" >&2
docker compose exec -e OPENAI_API_KEY -e ASSISTANTS_MODEL -T ai sh -lc "python -m app.assistants.orchestrator --task \"${TASK}\""

