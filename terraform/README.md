# Terraform Infrastructure (AWS)

This folder contains a starter blueprint to deploy the portal to AWS with autoscaling and SOC2/ISO-aligned controls. It provisions:

- VPC (3 AZs), public + private + database subnets
- ALB + CloudFront + WAF (AWS Managed rules), ACM TLS
- ECS Fargate cluster with services for web, api, ai
- RDS (Aurora PostgreSQL or Postgres) with KMS encryption
- ElastiCache Redis (cluster mode disabled) for sessions/rate-limit/cache
- ECR repositories for images
- IAM roles and task execution roles (least privilege)

Usage
- Install Terraform >= 1.5
- Option A: Real AWS (default)
  - Configure AWS credentials and region
  - Create a `terraform.tfvars` (see variables.tf)
  - `terraform init && terraform plan && terraform apply`

- Option B: Local testing with LocalStack (no AWS account required)
  - Requirements: Docker, docker-compose
  - Start LocalStack: `docker compose up -d localstack` (ensure LocalStack is in your root docker-compose.yml)
  - Use the minimal localstack stack which provisions only ECR repos:
    - `cd terraform/localstack`
    - `terraform init`
    - `terraform apply -var project_name=avnzr-local -var region=us-east-1`
  - The full EKS/ALB/CloudFront/WAF/RDS/ElastiCache stack is not supported by LocalStack. Use this minimal stack to validate builds and ECR flows.

Notes
- This is a starter; review and adapt CIDRs, sizing, and IAM.
- Secrets should live in AWS Secrets Manager/SSM (see variables for names/ARNs).
