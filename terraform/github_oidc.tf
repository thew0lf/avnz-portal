variable "github_org" { type = string }
variable "github_repo" { type = string }

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "gh_oidc_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals { type = "Federated" identifiers = [aws_iam_openid_connect_provider.github.arn] }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${var.project_name}-gh-actions"
  assume_role_policy = data.aws_iam_policy_document.gh_oidc_assume.json
}

data "aws_iam_policy_document" "gh_actions_policy" {
  statement {
    sid     = "ECRPushPull"
    effect  = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "gh_actions" {
  name   = "${var.project_name}-gh-actions-policy"
  policy = data.aws_iam_policy_document.gh_actions_policy.json
}

resource "aws_iam_role_policy_attachment" "gh_actions_attach" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.gh_actions.arn
}

output "github_actions_role_arn" { value = aws_iam_role.github_actions.arn }

