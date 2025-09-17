terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Standard AWS provider configuration. To use LocalStack, set USE_LOCALSTACK=true
# and export AWS credentials (can be dummy) alongside endpoint overrides below.
provider "aws" {
  region = var.region

  # When running against LocalStack, the AWS SDK honors these env vars:
  # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_EC2_METADATA_DISABLED=true
  # Endpoint overrides can be provided via the 'endpoints' block or environment variables.
  dynamic "endpoints" {
    for_each = var.use_localstack ? [1] : []
    content {
      apigateway     = "http://localhost:4566"
      cloudformation = "http://localhost:4566"
      cloudwatch     = "http://localhost:4566"
      dynamodb       = "http://localhost:4566"
      ec2            = "http://localhost:4566"
      ecs            = "http://localhost:4566"
      ecr            = "http://localhost:4566"
      elasticache    = "http://localhost:4566"
      elasticloadbalancing = "http://localhost:4566"
      iam            = "http://localhost:4566"
      kinesis        = "http://localhost:4566"
      kms            = "http://localhost:4566"
      lambda         = "http://localhost:4566"
      rds            = "http://localhost:4566"
      route53        = "http://localhost:4566"
      s3             = "http://localhost:4566"
      secretsmanager = "http://localhost:4566"
      ses            = "http://localhost:4566"
      sns            = "http://localhost:4566"
      sqs            = "http://localhost:4566"
      ssm            = "http://localhost:4566"
      sts            = "http://localhost:4566"
    }
  }

  # Skip a few provider validations when using LocalStack to avoid real AWS calls
  skip_credentials_validation = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
  s3_use_path_style           = var.use_localstack
  # Disable IMDS lookups in local environments
  skip_metadata_api_check     = var.use_localstack
}

# Alias provider for us-east-1 (required for CloudFront ACM certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
