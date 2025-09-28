variable "private_domain_name" {
  type        = string
  default     = ""
  description = "Optional private hosted zone domain (e.g., internal.example.com)"
}

resource "aws_route53_zone" "private" {
  count = var.private_domain_name != "" ? 1 : 0
  name  = var.private_domain_name
  vpc { vpc_id = aws_vpc.main.id }
  comment = "Private hosted zone for internal services"
  force_destroy = false
}

output "private_zone_id" { value = try(aws_route53_zone.private[0].zone_id, "") }

