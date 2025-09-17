resource "aws_wafv2_web_acl" "cf" {
  name        = "${var.project_name}-waf"
  description = "WAF for CloudFront"
  scope       = "CLOUDFRONT"

  default_action { allow {} }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action { none {} }
    statement { managed_rule_group_statement { name = "AWSManagedRulesCommonRuleSet" vendor_name = "AWS" } }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "common" sampled_requests_enabled = true }
  }

  visibility_config { cloudwatch_metrics_enabled = true metric_name = "web" sampled_requests_enabled = true }
}

# CloudFront distribution skeleton
resource "aws_cloudfront_distribution" "this" {
  count               = var.use_cloudfront_prod ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name}"

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "alb-origin"
    custom_origin_config { http_port = 80 https_port = 443 origin_protocol_policy = "http-only" origin_ssl_protocols = ["TLSv1.2"] }
  }

  default_cache_behavior {
    allowed_methods        = ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"]
    cached_methods         = ["GET","HEAD"]
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values { query_string = true headers = ["*"] }
  }

  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
  web_acl_id = aws_wafv2_web_acl.cf.arn
}

resource "aws_cloudfront_distribution" "staging" {
  count               = var.staging_domain_name != "" && var.use_cloudfront_staging ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name}-staging"

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "alb-origin-staging"
    custom_origin_config { http_port = 80 https_port = 443 origin_protocol_policy = "http-only" origin_ssl_protocols = ["TLSv1.2"] }
  }

  default_cache_behavior {
    allowed_methods        = ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"]
    cached_methods         = ["GET","HEAD"]
    target_origin_id       = "alb-origin-staging"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values { query_string = true headers = ["*"] }
  }

  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
  web_acl_id = aws_wafv2_web_acl.cf.arn
}
