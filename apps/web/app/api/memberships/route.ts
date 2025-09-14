import { NextRequest, NextResponse } from 'next/server'
import { serverApiBase } from '@/lib/api'
import { cookies } from 'next/headers'
import { getCookieName } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const api = serverApiBase()
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const r = await fetch(`${api}/memberships`, { headers: token? { authorization: `Bearer ${token}` } : {}, cache: 'no-store' })
  const data = await r.json().catch(()=>({}))
  return NextResponse.json(data, { status: r.status })
}

