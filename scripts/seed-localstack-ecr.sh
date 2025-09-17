#!/usr/bin/env bash
set -euo pipefail

REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=000000000000
ENDPOINT_URL=${ENDPOINT_URL:-http://localhost:4566}
PROJECT=${PROJECT_NAME:-avnzr-local}

echo "Seeding LocalStack ECR repos for project: $PROJECT"

aws --endpoint-url "$ENDPOINT_URL" ecr create-repository --repository-name "$PROJECT-api" || true
aws --endpoint-url "$ENDPOINT_URL" ecr create-repository --repository-name "$PROJECT-web" || true
aws --endpoint-url "$ENDPOINT_URL" ecr create-repository --repository-name "$PROJECT-ai" || true

TOKEN=$(aws --endpoint-url "$ENDPOINT_URL" ecr get-authorization-token --output text --query 'authorizationData[0].authorizationToken' | base64 -d | cut -d: -f2)
docker login -u AWS -p "$TOKEN" localhost:4566

for svc in api web ai; do
  docker pull alpine:3
  docker tag alpine:3 localhost:4566/$PROJECT-$svc:latest
  docker push localhost:4566/$PROJECT-$svc:latest
done

echo "Done. LocalStack ECR seeded with $PROJECT-(api|web|ai):latest"

