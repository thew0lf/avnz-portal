terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true
  skip_metadata_api_check     = true

  endpoints {
    ecr = "http://localhost:4566"
    iam = "http://localhost:4566"
    sts = "http://localhost:4566"
  }
}

