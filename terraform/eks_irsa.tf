terraform {
  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0"
    }
  }
}

data "tls_certificate" "eks" {
  url = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  url             = aws_eks_cluster.this.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
}

# External Secrets IRSA Role (read SSM/Secrets Manager)
data "aws_iam_policy_document" "eso_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals { type = "Federated" identifiers = [aws_iam_openid_connect_provider.eks.arn] }
    condition {
      test     = "StringEquals"
      variable = replace(aws_eks_cluster.this.identity[0].oidc[0].issuer, "https://", "") ~ ":sub"
      values   = [
        "system:serviceaccount:external-secrets:external-secrets"
      ]
    }
  }
}

resource "aws_iam_role" "external_secrets" {
  name               = "${var.project_name}-irsa-external-secrets"
  assume_role_policy = data.aws_iam_policy_document.eso_assume.json
}

data "aws_iam_policy_document" "eso_access" {
  statement {
    sid    = "SSMRead"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ]
    resources = [
      "arn:aws:ssm:*:*:parameter/avnzr/*"
    ]
  }
  statement {
    sid    = "SecretsManagerRead"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [
      "arn:aws:secretsmanager:*:*:secret:avnzr*"
    ]
  }
}

resource "aws_iam_policy" "external_secrets" {
  name   = "${var.project_name}-external-secrets-read"
  policy = data.aws_iam_policy_document.eso_access.json
}

resource "aws_iam_role_policy_attachment" "external_secrets_attach" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.external_secrets.arn
}

# External DNS IRSA Role (Route53 changes)
data "aws_iam_policy_document" "edns_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals { type = "Federated" identifiers = [aws_iam_openid_connect_provider.eks.arn] }
    condition {
      test     = "StringEquals"
      variable = replace(aws_eks_cluster.this.identity[0].oidc[0].issuer, "https://", "") ~ ":sub"
      values   = [
        "system:serviceaccount:external-dns:external-dns"
      ]
    }
  }
}

resource "aws_iam_role" "external_dns" {
  name               = "${var.project_name}-irsa-external-dns"
  assume_role_policy = data.aws_iam_policy_document.edns_assume.json
}

data "aws_iam_policy_document" "edns_access" {
  statement {
    sid     = "ListZones"
    effect  = "Allow"
    actions = ["route53:ListHostedZones", "route53:ListResourceRecordSets"]
    resources = ["*"]
  }
  statement {
    sid     = "ChangeRecords"
    effect  = "Allow"
    actions = ["route53:ChangeResourceRecordSets"]
    resources = [
      "arn:aws:route53:::hostedzone/${var.hosted_zone_id}" ,
      "arn:aws:route53:::hostedzone/${var.staging_hosted_zone_id}"
    ]
  }
}

resource "aws_iam_policy" "external_dns" {
  name   = "${var.project_name}-external-dns-route53"
  policy = data.aws_iam_policy_document.edns_access.json
}

resource "aws_iam_role_policy_attachment" "external_dns_attach" {
  role       = aws_iam_role.external_dns.name
  policy_arn = aws_iam_policy.external_dns.arn
}

output "external_secrets_irsa_role_arn" { value = aws_iam_role.external_secrets.arn }
output "external_dns_irsa_role_arn" { value = aws_iam_role.external_dns.arn }

