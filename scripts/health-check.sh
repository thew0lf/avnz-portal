#!/usr/bin/env bash
set -euo pipefail

echo "[health] Checking Docker daemon..."
docker version >/dev/null

echo "[health] Checking compose services are up..."
docker compose ps

echo "[health] Checking DB readiness..."
docker compose exec -T db pg_isready -U postgres -d avnzr_portal

echo "[health] Checking Redis ping..."
docker compose exec -T redis sh -lc "redis-cli ping | grep -q PONG"

echo "[health] Checking API /health..."
docker compose exec -T api sh -lc "wget -q -O- http://localhost:3001/health | grep -q '\"ok\":true'"

echo "[health] OK: db, redis, api all healthy"

