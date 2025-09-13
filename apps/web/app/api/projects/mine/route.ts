import { NextRequest, NextResponse } from 'next/server'
import { apiFetch } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const res = await apiFetch('/projects/mine')
  const data = await res.json().catch(()=>({ rows: [] }))
  return NextResponse.json(data, { status: res.status })
}

