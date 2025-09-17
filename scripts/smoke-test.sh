#!/usr/bin/env bash
set -euo pipefail

echo "[smoke] API /health"
docker compose exec -T api sh -lc "wget -q -O- http://localhost:3001/health | grep -q '\"ok\":true'"

echo "[smoke] API /api/app-settings"
docker compose exec -T api sh -lc "wget -q -O- http://localhost:3001/api/app-settings > /dev/null"

echo "[smoke] Web root /"
docker compose exec -T web sh -lc "wget -q -O- http://localhost:3000/ | grep -qi 'Welcome to Avnz Portal'"

echo "[smoke] Web /login"
docker compose exec -T web sh -lc "wget -q -O- http://localhost:3000/login | grep -qi 'Sign in'"

echo "[smoke] AI docs page"
# Use the web container to reach the ai service by hostname within the compose network
docker compose exec -T web sh -lc "wget -q -O- http://ai:8000/docs > /dev/null"

echo "[smoke] OK: core pages and endpoints responsive"
