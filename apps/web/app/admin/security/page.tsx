import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { revalidatePath } from 'next/cache'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import SecuritySettingsForm from '@/components/admin/forms/SecuritySettingsForm'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

async function save(formData: FormData){ 'use server'
  const nodeId = String(formData.get('nodeId')||'')
  const require_mfa = String(formData.get('require_mfa')||'') === 'on'
  const minLength = Number(formData.get('minLength')||'12')
  const requireUpper = String(formData.get('requireUpper')||'') === 'on'
  const requireLower = String(formData.get('requireLower')||'') === 'on'
  const requireDigit = String(formData.get('requireDigit')||'') === 'on'
  const requireSymbol = String(formData.get('requireSymbol')||'') === 'on'
  const audit_retention_days = Number(formData.get('audit_retention_days')||'365')
  await apiFetch(`/admin/security-settings?nodeId=${encodeURIComponent(nodeId)}`, { method:'PATCH', body: JSON.stringify({ require_mfa, password_policy: { minLength, requireUpper, requireLower, requireDigit, requireSymbol }, audit_retention_days }) })
  revalidatePath('/admin/security')
}

export default async function SecuritySettings(){
  const cookie = cookies().get(getCookieName()); const token = cookie?.value||''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/security')
  const nodeId = (session as any)?.orgUUID || ''
  const r = await apiFetch(`/admin/security-settings?nodeId=${encodeURIComponent(nodeId)}`)
  const cfg = await r.json().catch(()=>({}))
  const policy = cfg?.password_policy || {}
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Security Settings</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Policy</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <SecuritySettingsForm defaults={cfg || {}} />
        </CardContent>
      </Card>
    </main>
  )
}
