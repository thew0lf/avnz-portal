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

# Optional: ngrok health (if service is running)
if docker compose ps ngrok >/dev/null 2>&1; then
  # Determine if ngrok container is up; if not, skip
  if docker compose ps --status running ngrok | grep -q ngrok; then
    echo "[health] Checking ngrok tunnel API (localhost:4040)..."
    # Retry a few times in case tunnel is not yet established
    tries=0
    until curl -fsS http://localhost:4040/api/tunnels | grep -q 'public_url'; do
      tries=$((tries+1))
      if [ "$tries" -ge 5 ]; then
        echo "[health] ERROR: ngrok tunnel not ready (no public_url)" >&2
        exit 1
      fi
      sleep 2
    done
    echo "[health] ngrok tunnel detected"
  else
    echo "[health] NOTE: ngrok service is defined but not running; skipping ngrok check"
  fi
fi

echo "[health] OK: db, redis, api (and ngrok if running) healthy"
