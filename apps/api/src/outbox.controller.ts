import { Controller, Get, Post, Param, Query, BadRequestException, UseGuards } from '@nestjs/common'
import { pool } from './db.js'
import { Authz, RbacGuard } from './authz/rbac.guard.js'
import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs'

@Controller('admin/outbox')
@UseGuards(RbacGuard)
export class OutboxController {
  @Get('') @Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' })
  async list(@Query('nodeId') _nodeId?: string, @Query('status') status?: string, @Query('q') q?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const c = await pool.connect(); try {
      const lim = Math.max(1, Math.min(200, Number(limit || '20')))
      const off = Math.max(0, Number(offset || '0'))
      const args: any[] = []
      let sql = `select id, type, to_email, status, attempts, last_error, created_at, updated_at from outbox_emails`
      const cond: string[] = []
      if (status) { args.push(status); cond.push(`status=$${args.length}`) }
      if (q) { args.push(`%${q.toLowerCase()}%`); cond.push(`lower(to_email) like $${args.length}`) }
      if (cond.length) sql += ' where ' + cond.join(' and ')
      sql += ' order by created_at desc limit ' + lim + ' offset ' + off
      const r = await c.query(sql, args)
      return { rows: r.rows, limit: lim, offset: off, q: q || '', status: status || '' }
    } finally { c.release() }
  }

  @Get('stats') @Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' })
  async stats(@Query('nodeId') _nodeId?: string) {
    const c = await pool.connect(); try {
      const r = await c.query(`select status, count(*) as cnt from outbox_emails group by status`)
      const rows = r.rows
      const out: any = { rows }
      // Include SQS queue metrics when configured
      const queueUrl = process.env.SQS_QUEUE_URL
      const dlqUrl = process.env.SQS_DLQ_URL
      if (queueUrl) {
        try {
          const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
          const main = await sqs.send(new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['ApproximateNumberOfMessages','ApproximateNumberOfMessagesNotVisible'] }))
          out.sqs = {
            queueUrl,
            messages: Number(main.Attributes?.ApproximateNumberOfMessages || 0),
            inFlight: Number(main.Attributes?.ApproximateNumberOfMessagesNotVisible || 0)
          }
          if (dlqUrl) {
            const dlq = await sqs.send(new GetQueueAttributesCommand({ QueueUrl: dlqUrl, AttributeNames: ['ApproximateNumberOfMessages'] }))
            out.sqs.dlqUrl = dlqUrl
            out.sqs.dlqMessages = Number(dlq.Attributes?.ApproximateNumberOfMessages || 0)
          }
        } catch (e) {
          out.sqsError = String((e as any)?.message || e)
        }
      }
      return out
    } finally { c.release() }
  }

  @Post(':id/retry') @Authz({ action: 'configure', domain: 'node', resourceType: 'org', resourceParam: 'nodeId' })
  async retry(@Param('id') id: string) {
    if (!id) throw new BadRequestException('id required')
    const c = await pool.connect(); try {
      const r = await c.query('update outbox_emails set status=\'pending\', next_attempt_at=now(), last_error=null where id=$1', [id])
      if (r.rowCount === 0) throw new BadRequestException('not found')
      return { ok: true }
    } finally { c.release() }
  }
}
