import { NextRequest, NextResponse } from 'next/server'
import { serverApiBase } from '@/lib/api'

export async function GET(req: NextRequest) {
  const api = serverApiBase()
  const q = req.nextUrl.searchParams.toString()
  const orgId = req.headers.get('x-org-id') || ''
  const roles = req.headers.get('x-roles') || ''
  const r = await fetch(`${api}/usage/timeseries?${q}`, { headers: { 'x-org-id': orgId, 'x-roles': roles }, cache: 'no-store' })
  const data = await r.json().catch(()=>({}))
  return NextResponse.json(data, { status: r.status })
}

