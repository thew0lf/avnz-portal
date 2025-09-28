#!/usr/bin/env bash
set -euo pipefail

# Tests the OPENAI_API_KEY from the running aiworker container using both
# the OpenAI Python SDK and a fallback curl request. Prints clear pass/fail.

echo "[test-openai] Checking key presence in aiworker env"
docker compose exec -T aiworker python - <<'PY'
import os
k=os.getenv('OPENAI_API_KEY')
print('[env] OPENAI_API_KEY present:', bool(k))
print('[env] prefix:', (k[:12]+'…'+k[-8:]) if k else 'n/a')
PY

echo "[test-openai] Python SDK: list models"
docker compose exec -T aiworker python - <<'PY'
import os, sys
from openai import OpenAI
k=os.getenv('OPENAI_API_KEY')
try:
    client=OpenAI(api_key=k)
    # list models is a lightweight call
    ms=list(client.models.list())
    # If we get here without exception, key is valid
    print('[python] OK: received', len(ms), 'models')
except Exception as e:
    print('[python] ERROR:', repr(e))
    sys.exit(2)
PY

echo "[test-openai] HTTP: GET /v1/models"
docker compose exec -T aiworker sh -lc 'apk add --no-cache curl >/dev/null 2>&1 || true; curl -sS -w "\n[http] status=%{http_code}\n" -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models | sed -e "s/$OPENAI_API_KEY/[REDACTED]/g"'

echo "[test-openai] Done"

