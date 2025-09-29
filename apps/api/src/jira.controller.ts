import { BadRequestException, Controller, Get, Post, Query, Req, Param, ForbiddenException } from '@nestjs/common'
import crypto from 'node:crypto'
import { pool } from './db.js'
import { jiraOps } from './jira-backfill.js'
import { getServiceConfig } from './service-config.js'

function timingSafeEqual(a: string, b: string){
  try {
    const ab = Buffer.from(a, 'utf8'); const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb)
  } catch { return false }
}

@Controller('jira')
export class JiraController {
  private async getPhaseAssigneeName(phase: string, orgId?: string): Promise<string|undefined> {
    try {
      if (orgId) {
        const key = `assignee_${phase}`
        const cfg = await getServiceConfig(orgId, null, 'jira', key)
        if (cfg) {
          const picked = await this.pickFromList(cfg, orgId, phase)
          if (picked) return picked
        }
      }
    } catch {}
    const envKey = `JIRA_ASSIGNEE_${String(phase||'').toUpperCase()}`
    const v = process.env[envKey]
    if (v) return v
    const listEnv = process.env[envKey + '_LIST']
    if (listEnv) {
      const picked = await this.pickFromList(listEnv, orgId, phase)
      if (picked) return picked
    }
    return undefined
  }

  private async pickFromList(listVal: string, orgId: string|undefined, phase: string): Promise<string|undefined> {
    const raw = String(listVal || '')
    const parts = raw.split(/[;,
]+/).map(s => s.trim()).filter(Boolean)
    if (parts.length === 0) return undefined
    if (parts.length === 1) return parts[0]
    return parts[Math.floor(Math.random() * parts.length)]
  }

  private async chooseAssigneeForPhase(phase: string, orgId: string|undefined, domain: string, basic: string): Promise<{ name?: string, accountId?: string }|undefined> {
    const exclude = await this.getAssignmentExclude(orgId)
    let rawList = ''
    try {
      if (orgId) {
        const cfg = await getServiceConfig(orgId, null, 'jira', `assignee_${phase}`)
        if (cfg) rawList = cfg
      }
    } catch {}
    if (!rawList) {
      const envKey = `JIRA_ASSIGNEE_${String(phase||'').toUpperCase()}`
      rawList = process.env[envKey + '_LIST'] || process.env[envKey] || ''
    }
    const names = String(rawList || '')
      .split(/[;,
]+/)
      .map(s=>s.trim())
      .filter(Boolean)
      .map(s=> this.normalizeName(s))
      .filter(n => !exclude.has(n.toLowerCase()))
    if (names.length === 0) return undefined
    if (names.length === 1) {
      const acct = await this.resolveAccountId(names[0], domain, basic)
      return acct ? { name: names[0], accountId: acct } : undefined
    }
    let doLB = (process.env.JIRA_LOAD_BALANCE||'1') === '1'
    try {
      if (orgId) {
        const lbCfg = await getServiceConfig(orgId, null, 'jira', 'load_balance')
        if (typeof lbCfg === 'string' && lbCfg.length > 0) doLB = (lbCfg === '1' || lbCfg.toLowerCase() === 'true')
      }
    } catch {}
    if (doLB) {
      const counts: Array<{ name:string, accountId?:string, open:number }> = []
      const project = process.env.JIRA_PROJECT_KEY || 'AVNZ'
      for (const n of names) {
        if (exclude.has(n.toLowerCase())) continue
        const acct = await this.resolveAccountId(n, domain, basic)
        if (!acct) { counts.push({ name:n, open: 1e9 }); continue }
        try {
          const jql = encodeURIComponent(`project = ${project} AND assignee = ${acct} AND statusCategory != Done`)
        }
      }
    }
  }
}