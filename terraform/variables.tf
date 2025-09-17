variable "project_name" { type = string }
variable "region" { type = string }
variable "vpc_cidr" { type = string default = "10.20.0.0/16" }
variable "public_subnets" { type = list(string) default = ["10.20.0.0/24","10.20.1.0/24","10.20.2.0/24"] }
variable "private_subnets" { type = list(string) default = ["10.20.10.0/24","10.20.11.0/24","10.20.12.0/24"] }
variable "db_subnets" { type = list(string) default = ["10.20.20.0/24","10.20.21.0/24","10.20.22.0/24"] }

# Local testing toggle (no AWS account required when true)
variable "use_localstack" { type = bool default = false }

variable "domain_name" { type = string }
variable "hosted_zone_id" { type = string }
variable "acm_certificate_arn" { type = string }
variable "use_cloudfront_prod" { type = bool default = true }
variable "use_cloudfront_staging" { type = bool default = true }
variable "staging_domain_name" { type = string default = "" }
variable "staging_hosted_zone_id" { type = string default = "" }

variable "db_name" { type = string default = "avnzr_portal" }
variable "db_username" { type = string default = "portal" }
variable "db_password_ssm_name" { type = string description = "SSM SecureString name for DB password" }

variable "redis_node_type" { type = string default = "cache.t4g.micro" }
variable "redis_num_nodes" { type = number default = 1 }

variable "api_image" { type = string }
variable "web_image" { type = string }
variable "ai_image" { type = string }

variable "ssm_auth_secret_name" { type = string }
variable "ssm_db_url_name" { type = string }
variable "ssm_app_aes_key_name" { type = string }

# EKS + ArgoCD
variable "cluster_name" { type = string default = "avnzr-eks" }
variable "node_instance_types" { type = list(string) default = ["t3.medium"] }
variable "node_desired_size" { type = number default = 3 }
variable "node_min_size" { type = number default = 2 }
variable "node_max_size" { type = number default = 6 }
