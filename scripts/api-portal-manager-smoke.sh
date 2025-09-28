#!/usr/bin/env bash
set -euo pipefail
echo "[api-test] Portal-manager smoke"
bash scripts/api-admin-access-test.sh
bash scripts/api-templates-test.sh || true
echo "[api-test] Portal-manager smoke done (templates may fail without email config)"

