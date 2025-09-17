import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

let sqs: SQSClient | null = null
function getSqs(): SQSClient | null {
  if (!process.env.SQS_QUEUE_URL) return null
  if (!sqs) sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
  return sqs
}

export async function publishEmailJob(msg: any, opts?: { idempotencyKey?: string }) {
  const queueUrl = process.env.SQS_QUEUE_URL
  const client = getSqs()
  if (!queueUrl || !client) return false
  const body = JSON.stringify(msg)
  const cmd = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: body,
    MessageGroupId: undefined,
    MessageDeduplicationId: undefined,
    MessageAttributes: opts?.idempotencyKey ? {
      idempotencyKey: { DataType: 'String', StringValue: opts.idempotencyKey }
    } : undefined,
  })
  await client.send(cmd)
  return true
}

