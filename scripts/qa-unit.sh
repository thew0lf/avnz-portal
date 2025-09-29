#!/usr/bin/env bash
set -euo pipefail

# Run unit/integration tests via existing scripts and containers where applicable.

echo "[qa] API integration tests..."
bash scripts/api-test.sh || { echo "[qa] API tests failed" >&2; exit 1; }

echo "[qa] Smoke tests..."
bash scripts/smoke-test.sh || { echo "[qa] Smoke tests failed" >&2; exit 1; }

echo "[qa] Walkthrough..."
bash scripts/walkthrough.sh || { echo "[qa] Walkthrough failed" >&2; exit 1; }

echo "[qa] Unit/Integration test suite complete."

