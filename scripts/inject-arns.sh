#!/usr/bin/env bash
set -euo pipefail

# Usage: ES_IRSA_ARN=... DNS_IRSA_ARN=... AWS_REGION=... PROD_DOMAIN=... STAGING_DOMAIN=... PRIVATE_DOMAIN=... bash scripts/inject-arns.sh

ES_ARNS=${ES_IRSA_ARN:-}
DNS_ARNS=${DNS_IRSA_ARN:-}
AWS_REGION=${AWS_REGION:-us-east-1}
PROD_DOMAIN=${PROD_DOMAIN:-}
STAGING_DOMAIN=${STAGING_DOMAIN:-}
PRIVATE_DOMAIN=${PRIVATE_DOMAIN:-}

if [[ -n "$ES_ARNS" ]]; then
  sed -i.bak "s#REPLACE_ES_IRSA_ROLE_ARN#${ES_ARNS}#g" argo/external-secrets.yaml
fi
if [[ -n "$DNS_ARNS" ]]; then
  sed -i.bak "s#REPLACE_DNS_IRSA_ROLE_ARN#${DNS_ARNS}#g" argo/external-dns.yaml argo/external-dns-internal.yaml
fi
sed -i.bak "s#REPLACE_AWS_REGION#${AWS_REGION}#g" k8s/eso/clustersecretstore-ssm.yaml k8s/eso/clustersecretstore-secretsmanager.yaml k8s/eso/clustersecretstore-ssm-staging.yaml k8s/eso/clustersecretstore-secretsmanager-staging.yaml

if [[ -n "$PROD_DOMAIN" ]]; then
  sed -i.bak "s#REPLACE_PROD_DOMAIN#${PROD_DOMAIN}#g" argo/external-dns.yaml
fi
if [[ -n "$STAGING_DOMAIN" ]]; then
  sed -i.bak "s#REPLACE_STAGING_DOMAIN#${STAGING_DOMAIN}#g" argo/external-dns.yaml
fi
if [[ -n "$PRIVATE_DOMAIN" ]]; then
  sed -i.bak "s#REPLACE_PRIVATE_DOMAIN#${PRIVATE_DOMAIN}#g" argo/external-dns-internal.yaml
fi

echo "Injection complete. Review updated Argo and ESO store manifests."

