#!/usr/bin/env bash
set -euo pipefail

# Queue multiple RPS→FastAPI migration tasks via the portal proxy.
# Usage:
#   ORG_ID=... CLIENT_ID=... PROJECT_CODE=... bash scripts/agents/queue-tasks.sh
# or
#   bash scripts/agents/queue-tasks.sh --org YOUR_ORG_UUID --client YOUR_CLIENT_UUID --project YOUR_PROJECT_CODE

ORG_ID=${ORG_ID:-}
CLIENT_ID=${CLIENT_ID:-}
PROJECT_CODE=${PROJECT_CODE:-}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org) ORG_ID="$2"; shift 2;;
    --client) CLIENT_ID="$2"; shift 2;;
    --project) PROJECT_CODE="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

queue() {
  local title="$1"; shift
  local body="$1"; shift
  local task
  task="${title}

${body}"
  local payload
  payload=$(jq -c --null-input \
    --arg task "$task" \
    --arg org "$ORG_ID" \
    --arg client "$CLIENT_ID" \
    --arg project "$PROJECT_CODE" \
    '{ task: $task, meta: { org_id: ($org // null), client_id: ($client // null), project_code: ($project // null) } }')

  echo "[queue] $title"
  docker compose exec -T web sh -lc "wget -q -O- --header='content-type: application/json' --method=POST --body-data='${payload//"/\"}' http://localhost:3000/api/agents/jobs" | jq .
}

DISCOVERY_BODY='Approach (Phased): Discovery & ADR. Inventory RPS modules, dependencies, I/O contracts, data stores, side effects. Deliver ADR with target architecture, data model approach, service boundaries, and authz. List Inputs Needed and assumptions.'

DOMAIN_MODEL_BODY='Domain model mapping. Translate Mongo ODM docs → Pydantic/SQLAlchemy models and SQL schema (idempotent migrations). Identify embedded→relational strategy (JSONB where needed). Output: models draft, migration scripts, compatibility adapters.'

READ_ONLY_ROUTERS_BODY='Routers/Services (read-only). Implement Orders/Customers/Transactions services with JWT/RBAC; expose FastAPI routers mirroring current list/detail in Nest. Add simple tests and OpenAPI docs. No writes yet.'

ETL_PLAN_BODY='ETL/Backfill plan. Draft extraction strategy from Mongo/CRM, mapping to Postgres schema, idempotency keys, and validation. Propose shadow tests, staged backfill, and cutover/rollback plan.'

# Queue selected tasks (3 parallel): Domain Model, Read-only Routers, ETL Plan
queue "RPS→FastAPI: Domain Model Mapping" "$DOMAIN_MODEL_BODY"
queue "RPS→FastAPI: Routers/Services (read-only) for Orders/Customers/Transactions" "$READ_ONLY_ROUTERS_BODY"
queue "RPS→FastAPI: ETL/Backfill Plan" "$ETL_PLAN_BODY"

echo "[queue] Done. Visit /admin/dashboard/tasks to monitor."

