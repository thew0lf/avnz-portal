#!/usr/bin/env bash
set -euo pipefail

echo "[walkthrough] Quick non-destructive portal walkthrough"

echo "1) Verify services"
bash scripts/health-check.sh

echo "2) API app settings"
docker compose exec -T api sh -lc "wget -q -O- http://localhost:3001/api/app-settings | sed -n '1,80p'"

echo "3) Web home + login pages"
docker compose exec -T web sh -lc "wget -q -O- http://localhost:3000/ | sed -n '1,40p' >/tmp/home.html && echo '   Home OK'"
docker compose exec -T web sh -lc "wget -q -O- http://localhost:3000/login | sed -n '1,40p' >/tmp/login.html && echo '   Login OK'"

echo "4) Admin routes (should require auth)"
set +e
docker compose exec -T web sh -lc "wget -q -S -O- http://localhost:3000/admin 2>&1 | grep -E 'HTTP/.*(200|302)'"
RC=$?
set -e
if [ $RC -ne 0 ]; then
  echo "[walkthrough] WARN: /admin did not return 200/302"
fi

echo "[walkthrough] Complete. Review output above; no mutations were performed."

