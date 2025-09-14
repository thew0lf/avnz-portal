import { NextRequest, NextResponse } from 'next/server'
import { serverApiBase } from '@/lib/api'

export async function POST(req: NextRequest) {
  // SOC2 compliance: do not reveal whether the account exists.
  // Always return a generic success response to the client.
  try {
    const api = serverApiBase()
    const { client_code, email, identifier } = await req.json()
    await fetch(`${api}/auth/request-reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_code, email, identifier }),
    })
  } catch {
    // ignore errors intentionally to avoid user enumeration
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}
