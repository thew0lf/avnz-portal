data "aws_route53_zone" "prod" {
  zone_id = var.hosted_zone_id
}

data "aws_route53_zone" "staging" {
  count  = var.staging_hosted_zone_id != "" ? 1 : 0
  zone_id = var.staging_hosted_zone_id
}

# CloudFront requires certs in us-east-1
resource "aws_acm_certificate" "prod_cf" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
}

resource "aws_route53_record" "prod_cf_validation" {
  for_each = {
    for dvo in aws_acm_certificate.prod_cf.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
  zone_id = data.aws_route53_zone.prod.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.value]
}

resource "aws_acm_certificate_validation" "prod_cf" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.prod_cf.arn
  validation_record_fqdns = [for record in aws_route53_record.prod_cf_validation : record.fqdn]
}

resource "aws_acm_certificate" "staging_cf" {
  provider          = aws.us_east_1
  count             = var.staging_domain_name != "" ? 1 : 0
  domain_name       = var.staging_domain_name
  validation_method = "DNS"
}

resource "aws_route53_record" "staging_cf_validation" {
  count  = var.staging_domain_name != "" ? 1 : 0
  for_each = var.staging_domain_name != "" ? {
    for dvo in aws_acm_certificate.staging_cf[0].domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  } : {}
  zone_id = data.aws_route53_zone.staging[0].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.value]
}

resource "aws_acm_certificate_validation" "staging_cf" {
  provider                = aws.us_east_1
  count                   = var.staging_domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.staging_cf[0].arn
  validation_record_fqdns = [for record in aws_route53_record.staging_cf_validation : record.fqdn]
}

output "prod_cf_cert_arn" { value = aws_acm_certificate_validation.prod_cf.certificate_arn }
output "staging_cf_cert_arn" { value = try(aws_acm_certificate_validation.staging_cf[0].certificate_arn, "") }

