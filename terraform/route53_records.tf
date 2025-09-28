data "aws_elb_hosted_zone_id" "alb" {}

resource "aws_route53_record" "prod_cf_alias_a" {
  count   = var.use_cloudfront_prod ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.this[0].domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "prod_cf_alias_aaaa" {
  count   = var.use_cloudfront_prod ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.this[0].domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "prod_alb_alias_a" {
  count   = var.use_cloudfront_prod ? 0 : 1
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "prod_alb_alias_aaaa" {
  count   = var.use_cloudfront_prod ? 0 : 1
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"
  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "staging_cf_alias_a" {
  count   = var.staging_domain_name != "" && var.use_cloudfront_staging ? 1 : 0
  zone_id = var.staging_hosted_zone_id
  name    = var.staging_domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.staging[0].domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "staging_cf_alias_aaaa" {
  count   = var.staging_domain_name != "" && var.use_cloudfront_staging ? 1 : 0
  zone_id = var.staging_hosted_zone_id
  name    = var.staging_domain_name
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.staging[0].domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}
resource "aws_route53_record" "staging_alb_alias_a" {
  count   = var.staging_domain_name != "" && var.use_cloudfront_staging ? 0 : var.staging_domain_name != "" ? 1 : 0
  zone_id = var.staging_hosted_zone_id
  name    = var.staging_domain_name
  type    = "A"
  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "staging_alb_alias_aaaa" {
  count   = var.staging_domain_name != "" && var.use_cloudfront_staging ? 0 : var.staging_domain_name != "" ? 1 : 0
  zone_id = var.staging_hosted_zone_id
  name    = var.staging_domain_name
  type    = "AAAA"
  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = false
  }
}
