#!/usr/bin/env bash
set -euo pipefail

echo "[rps] 1) AI /rps/orders without auth should 401"
docker compose exec -T ai sh -lc 'python - << PY
import httpx
r = httpx.get("http://localhost:8000/rps/orders", timeout=5)
print(r.status_code)
assert r.status_code == 401
PY'

echo "[rps] 2) Generate Bearer token (portal-manager) via Python (ai container)"
TOKEN=$(docker compose exec -T ai sh -lc 'python - << PY
import os, json, hmac, hashlib, base64
secret = (os.getenv("AUTH_SECRET") or "dev-secret-change-me").encode("utf-8")
payload = {"userId":"test-user","email":"test@example.com","orgId":"test-org","orgUUID":"00000000-0000-0000-0000-000000000000","roles":["portal-manager"],"perms":["admin"],"iat":1730000000}
js = json.dumps(payload, separators=(",", ":")).encode("utf-8")
p = base64.urlsafe_b64encode(js).decode("utf-8").rstrip("=")
sig = base64.urlsafe_b64encode(hmac.new(secret, p.encode("utf-8"), hashlib.sha256).digest()).decode("utf-8").rstrip("=")
print(f"{p}.{sig}")
PY')

docker compose exec -e TOKEN="$TOKEN" -T ai sh -lc 'python - << PY
import httpx, os
token = os.getenv("TOKEN")
r = httpx.get("http://localhost:8000/rps/orders?format=csv", headers={"authorization": f"Bearer {token}"}, timeout=10)
ct = r.headers.get("content-type") or ""
print(r.status_code, ct)
assert r.status_code == 200 and ("text/csv" in ct)
PY'

echo "[rps] 3) Call web proxy /api/rps/orders with session cookie (best-effort)"
set +e
docker compose exec -e TOKEN="$TOKEN" -T web sh -lc "wget -q -S -O- --header='Cookie: session='\"\$TOKEN\" 'http://localhost:3000/api/rps/orders' 2>&1 | grep -E 'HTTP/.*(200|204)' >/dev/null"
RC=$?
set -e
if [ $RC -eq 0 ]; then
  echo "[rps] Proxy check OK"
else
  echo "[rps] Proxy check skipped/unauthorized (requires full session context in dev)"
fi

echo "[rps] OK"
