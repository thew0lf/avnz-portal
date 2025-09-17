data "aws_iam_policy_document" "mailer_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals { type = "Federated" identifiers = [aws_iam_openid_connect_provider.eks.arn] }
    condition {
      test     = "StringEquals"
      variable = "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub"
      values   = [
        "system:serviceaccount:default:mailer-worker", # adjust namespace if needed
      ]
    }
  }
}

data "aws_iam_policy_document" "mailer_access" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl"
    ]
    resources = [
      aws_sqs_queue.email_main[0].arn,
    ]
  }
}

resource "aws_iam_role" "mailer_worker" {
  name               = "${var.project_name}-irsa-mailer-worker"
  assume_role_policy = data.aws_iam_policy_document.mailer_assume.json
}

resource "aws_iam_policy" "mailer_worker" {
  name   = "${var.project_name}-mailer-worker-sqs"
  policy = data.aws_iam_policy_document.mailer_access.json
}

resource "aws_iam_role_policy_attachment" "mailer_attach" {
  role       = aws_iam_role.mailer_worker.name
  policy_arn = aws_iam_policy.mailer_worker.arn
}

output "mailer_worker_irsa_role_arn" {
  value       = aws_iam_role.mailer_worker.arn
  description = "IRSA role ARN for mailer worker ServiceAccount"
}

