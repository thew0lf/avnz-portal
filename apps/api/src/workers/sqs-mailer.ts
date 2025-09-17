import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'
import { sendPasswordResetEmail } from '../mailer.js'
import { pool } from '../db.js'

const queueUrl = process.env.SQS_QUEUE_URL || ''
const region = process.env.AWS_REGION || 'us-east-1'

async function processMessage(m: any) {
  const body = typeof m.Body === 'string' ? m.Body : ''
  const msg = body ? JSON.parse(body) : {}
  const type = msg?.type
  if (type === 'email.password_reset') {
    const to = msg?.to
    const token = msg?.vars?.token
    const orgId = msg?.orgId || null
    const clientId = msg?.clientId || null
    if (!to || !token) throw new Error('missing fields')
    await sendPasswordResetEmail(String(to), String(token), { orgId: orgId || undefined, clientId: clientId || undefined })
    // Mark outbox row sent when present
    const key = msg?.idempotencyKey
    if (key) {
      const c = await pool.connect(); try{ await c.query('update outbox_emails set status=$2, sent_at=now() where idempotency_key=$1', [key, 'sent']) } finally { c.release() }
    }
  } else {
    throw new Error('unsupported type')
  }
}

export async function runOnce(limit = 5) {
  if (!queueUrl) throw new Error('SQS_QUEUE_URL not set')
  const sqs = new SQSClient({ region })
  const r = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: limit,
    WaitTimeSeconds: 10,
    VisibilityTimeout: 60,
    MessageAttributeNames: ['All'],
  }))
  for (const m of r.Messages || []) {
    try {
      await processMessage(m)
      if (m.ReceiptHandle) await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: m.ReceiptHandle }))
    } catch (e) {
      // Let SQS retry; do not delete
      console.warn('SQS worker error:', e)
    }
  }
}

if (process.argv[1] && process.argv[1].includes('sqs-mailer')) {
  runOnce(10).then(()=>{ console.log('SQS batch processed'); process.exit(0) }).catch(e=>{ console.error(e); process.exit(1) })
}

