#!/usr/bin/env bash
set -euo pipefail

# Create a QA client + user with a unique SOC2‑compliant test identity for Web login.
# Usage:
#   bash scripts/qa-create-login.sh [orgCode] [clientCode] [email] [password]
# Defaults (auto‑generated when omitted):
#   orgCode=avnz, clientCode=qaweb, email=qa+<ts>-<rand>@example.com, password=random strong

ORG_CODE=${1:-avnz}
CLIENT_CODE=${2:-qaweb}

# Generate a unique, non‑PII test email in a reserved domain when not provided
if [[ -n "${3:-}" ]]; then
  EMAIL="$3"
else
  ts=$(date +%Y%m%d%H%M%S)
  rand=$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 6 || true)
  EMAIL="qa+${ts}-${rand}@example.com"
fi

# Generate a strong random password when not provided (>=16 chars, includes classes)
gen_pw() {
  # 24 chars: upper, lower, digit, symbol at minimum once
  upper=$(LC_ALL=C tr -dc 'A-Z' </dev/urandom | head -c 2)
  lower=$(LC_ALL=C tr -dc 'a-z' </dev/urandom | head -c 6)
  digits=$(LC_ALL=C tr -dc '0-9' </dev/urandom | head -c 4)
  syms=$(LC_ALL=C tr -dc '!@#%^*-_=+?' </dev/urandom | head -c 2)
  rest=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#%^*-_=+?' </dev/urandom | head -c 10)
  pw="${upper}${lower}${digits}${syms}${rest}"
  # shuffle
  echo "$pw" | fold -w1 | awk 'BEGIN{srand()} {a[NR]=$0} END{for(i=1;i<=NR;i++){j=int(rand()*NR)+1; t=a[i]; a[i]=a[j]; a[j]=t} for(i=1;i<=NR;i++) printf a[i]; print ""}'
}

if [[ -n "${4:-}" ]]; then
  PASSWORD="$4"
else
  PASSWORD=$(gen_pw)
fi

echo "[qa] Seeding QA login for orgCode=${ORG_CODE}, clientCode=${CLIENT_CODE}"

# 1) Resolve org UUID from organizations table
ORG_ID=$(docker compose exec -T db psql -U postgres -d avnzr_portal -tAc \
  "select id from organizations where lower(code)=lower('${ORG_CODE}') limit 1;")
ORG_ID=$(echo "$ORG_ID" | tr -d ' \n\r')
if [[ -z "$ORG_ID" ]]; then
  echo "[qa] ERROR: organizations.code='${ORG_CODE}' not found" >&2; exit 1
fi
echo "[qa] orgId=${ORG_ID}"

# 2) Ensure client exists for this org (idempotent)
HAS_CLIENT=$(docker compose exec -T db psql -U postgres -d avnzr_portal -tAc \
  "select 1 from clients where org_id='${ORG_ID}' and code='${CLIENT_CODE}' limit 1;") || true
if [[ -z "$HAS_CLIENT" ]]; then
  docker compose exec -T db psql -U postgres -d avnzr_portal -c \
    "insert into clients(org_id, code, name) values ('${ORG_ID}','${CLIENT_CODE}','QA Client')" >/dev/null
  echo "[qa] created client ${CLIENT_CODE}"
else
  echo "[qa] client ${CLIENT_CODE} already exists"
fi

# 3) Compute password hash using API container's node + argon2
HASH=$(docker compose exec -T api sh -lc \
  "node -e \"(async()=>{const a=require('argon2'); const h=await a.hash('${PASSWORD}'); console.log(h)})()\"" 2>/dev/null | tr -d '\r')
if [[ -z "$HASH" ]]; then echo "[qa] ERROR: could not compute password hash" >&2; exit 1; fi
echo "[qa] hash computed"

# 4) Upsert user and membership for this org
USER_ID=$(docker compose exec -T db psql -U postgres -d avnzr_portal -tAc \
  "select id from users where lower(email)=lower('${EMAIL}') limit 1;") | tr -d ' \n\r'
if [[ -z "$USER_ID" ]]; then
  USER_ID=$(docker compose exec -T db psql -U postgres -d avnzr_portal -tAc \
    "insert into users(org_id,email,username,password_hash) values ('${ORG_CODE}','${EMAIL}', null, '${HASH}') returning id;") | tr -d ' \n\r'
  echo "[qa] created user id=${USER_ID}"
else
  docker compose exec -T db psql -U postgres -d avnzr_portal -c \
    "update users set password_hash='${HASH}' where id='${USER_ID}'" >/dev/null
  echo "[qa] updated user password id=${USER_ID}"
fi

HAS_MEM=$(docker compose exec -T db psql -U postgres -d avnzr_portal -tAc \
  "select 1 from memberships where user_id='${USER_ID}' and org_id='${ORG_ID}' limit 1;") | tr -d ' \n\r'
if [[ -z "$HAS_MEM" ]]; then
  docker compose exec -T db psql -U postgres -d avnzr_portal -c \
    "insert into memberships(user_id, org_id, role) values ('${USER_ID}','${ORG_ID}','org')" >/dev/null
  echo "[qa] created membership (role=org)"
else
  echo "[qa] membership exists"
fi

echo
echo "[qa] Success. Use these credentials on the login page:"
echo "  Client code: ${CLIENT_CODE}"
echo "  Email:       ${EMAIL}"
echo "  Password:    ${PASSWORD}"
