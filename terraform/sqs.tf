variable "create_sqs" { type = bool, default = true }
variable "sqs_queue_name" { type = string, default = null }
variable "sqs_dlq_name" { type = string, default = null }

locals {
  sqs_queue_name = coalesce(var.sqs_queue_name, "${var.project_name}-email-queue")
  sqs_dlq_name   = coalesce(var.sqs_dlq_name,   "${var.project_name}-email-queue-dlq")
}

resource "aws_sqs_queue" "email_dlq" {
  count = var.create_sqs ? 1 : 0
  name  = local.sqs_dlq_name
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "email_main" {
  count = var.create_sqs ? 1 : 0
  name  = local.sqs_queue_name

  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 10
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq[0].arn
    maxReceiveCount     = 5
  })
}

output "sqs_queue_url" {
  value       = var.create_sqs ? aws_sqs_queue.email_main[0].url : null
  description = "Main SQS queue URL for email jobs"
}

output "sqs_queue_arn" {
  value       = var.create_sqs ? aws_sqs_queue.email_main[0].arn : null
  description = "Main SQS queue ARN"
}

output "sqs_dlq_url" {
  value       = var.create_sqs ? aws_sqs_queue.email_dlq[0].url : null
  description = "DLQ URL for email jobs"
}

output "sqs_dlq_arn" {
  value       = var.create_sqs ? aws_sqs_queue.email_dlq[0].arn : null
  description = "DLQ ARN for email jobs"
}

