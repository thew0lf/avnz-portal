output "vpc_id" { value = try(aws_vpc.main.id, "") }
output "public_subnets" { value = try(aws_subnet.public[*].id, []) }
output "private_subnets" { value = try(aws_subnet.private[*].id, []) }
output "db_subnets" { value = try(aws_subnet.db[*].id, []) }
output "alb_dns" { value = try(aws_lb.app.dns_name, "") }
output "cloudfront_domain" { value = try(aws_cloudfront_distribution.this.domain_name, "") }
output "rds_endpoint" { value = try(aws_db_instance.postgres.address, "") }
output "redis_endpoint" { value = try(aws_elasticache_cluster.redis.configuration_endpoint, "") }
