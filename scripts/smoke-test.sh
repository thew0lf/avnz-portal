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

# Optional: ngrok smoke (if running) — verify tunnel exists and proxies API /health
if docker compose ps --status running ngrok | grep -q ngrok; then
  echo "[smoke] ngrok tunnel present"
  # Extract first public_url via simple sed; fallback is to just verify tunnels API
  NGROK_URL=$(curl -fsS http://localhost:4040/api/tunnels | sed -n 's/.*\"public_url\":\"\(http[s]*:[^\"]*\)\".*/\1/p' | head -n1)
  if [ -n "$NGROK_URL" ]; then
    echo "[smoke] ngrok hitting API /health via $NGROK_URL"
    curl -fsS "$NGROK_URL/health" | grep -q '"ok":true'
  else
    echo "[smoke] WARN: Could not parse ngrok public_url; checking tunnels endpoint only"
    curl -fsS http://localhost:4040/api/tunnels | grep -q 'tunnels'
  fi
  echo "[smoke] OK: ngrok responsive"
else
  echo "[smoke] NOTE: ngrok not running; skipping ngrok checks"
fi

echo "[smoke] Admin pages (compile check)"
# These should 200 or 302 to /login when unauthenticated; also forces Next to compile routes
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/admin 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/admin/clients 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/admin/projects 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/admin/invites 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/admin/dashboard/tasks 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
echo "[smoke] OK: admin pages compiled"

echo "[smoke] Settings pages (compile check)"
# These should 200 or 302 to /login when unauthenticated; also forces Next to compile routes
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/settings 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/settings/profile 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/settings/password 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/settings/appearance 2>&1 | grep -E 'HTTP/.*(200|302)' >/dev/null"
echo "[smoke] OK: settings pages compiled"
