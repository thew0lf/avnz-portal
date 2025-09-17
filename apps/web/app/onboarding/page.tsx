"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

type Step = 'sendgrid' | 'twilio' | 'aws' | 'done'

export default function Onboarding() {
  const [step, setStep] = React.useState<Step>('sendgrid')
  const router = useRouter()
  const { success, error: toastError } = useToast()

  function next() {
    setStep((s) => (s === 'sendgrid' ? 'twilio' : s === 'twilio' ? 'aws' : s === 'aws' ? 'done' : 'done'))
  }

  function skip() {
    next()
    if (step === 'done') router.push('/admin')
  }

  async function saveSendgrid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const api_key = String(fd.get('sg_api_key') || '')
    const from = String(fd.get('sg_from') || '')
    // Validate only if present: if any field is provided, require both
    if ((api_key || from) && (!api_key || !from)) {
      toastError('SendGrid: provide both API key and From address or leave blank')
      return
    }
    if (api_key && from) {
      // Save secrets via admin proxy (org-scoped). Two upserts.
      const r1 = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/services/configs', method: 'POST', body: { service: 'sendgrid', name: 'api_key', value: api_key } }) })
      const r2 = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/services/configs', method: 'POST', body: { service: 'sendgrid', name: 'from', value: from } }) })
      if (!r1.ok || !r2.ok) { toastError('We could not save SendGrid settings'); return }
      success('SendGrid settings saved')
    }
    next()
  }

  async function saveTwilio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const account_sid = String(fd.get('tw_sid') || '')
    const auth_token = String(fd.get('tw_token') || '')
    const from = String(fd.get('tw_from') || '')
    // Validate only if present: if any field is provided, require all
    const any = account_sid || auth_token || from
    const all = !!(account_sid && auth_token && from)
    if (any && !all) { toastError('Twilio: provide SID, Auth Token, and From number, or leave blank'); return }
    if (all) {
      const saves = [
        ['account_sid', account_sid],
        ['auth_token', auth_token],
        ['from', from],
      ] as const
      for (const [name, value] of saves) {
        const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/services/configs', method: 'POST', body: { service: 'twilio', name, value } }) })
        if (!r.ok) { toastError('We could not save Twilio settings'); return }
      }
      success('Twilio settings saved')
    }
    next()
  }

  async function saveAws(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const region = String(fd.get('aws_region') || '')
    const sesFrom = String(fd.get('aws_ses_from') || '')
    const accessKeyId = String(fd.get('aws_access_key_id') || '')
    const secretAccessKey = String(fd.get('aws_secret_access_key') || '')
    const any = region || sesFrom || accessKeyId || secretAccessKey
    if (!any) { next(); return }
    // Validation: require region and from if anything provided
    if (!region || !sesFrom) { toastError('AWS: provide Region and SES From address'); return }
    // If one credential present, require both (for dev; in prod prefer roles)
    if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) { toastError('AWS: provide both Access Key ID and Secret Access Key, or leave both blank'); return }
    // Save
    const saves: Array<[string,string]> = [
      ['region', region],
      ['ses_from', sesFrom],
    ]
    if (accessKeyId && secretAccessKey) {
      saves.push(['access_key_id', accessKeyId])
      saves.push(['secret_access_key', secretAccessKey])
    }
    for (const [name, value] of saves) {
      const r = await fetch('/api/admin/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: '/admin/services/configs', method: 'POST', body: { service: 'aws', name, value } }) })
      if (!r.ok) { toastError('We could not save AWS settings'); return }
    }
    success('AWS settings saved')
    next()
  }

  if (step === 'done') {
    return (
      <main className="p-6 flex justify-center">
        <Card className="w-full max-w-xl space-y-4">
          <CardHeader><CardTitle>Setup complete</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>You can configure more services later under Admin → Secrets.</p>
              <Button onClick={() => router.push('/admin')}>Go to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="p-6 flex justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Onboarding: {step === 'sendgrid' ? 'SendGrid (Email)' : step === 'twilio' ? 'Twilio (SMS)' : 'AWS (Region/SES)'}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'sendgrid' && (
            <form className="space-y-3" method="post" onSubmit={saveSendgrid}>
              <div>
                <label className="block text-sm text-muted-foreground">From Address</label>
                <Input name="sg_from" placeholder="no-reply@your-domain.com" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">API Key</label>
                <Input name="sg_api_key" placeholder="SG.xxxxx" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={skip}>Skip</Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}
          {step === 'twilio' && (
            <form className="space-y-3" method="post" onSubmit={saveTwilio}>
              <div>
                <label className="block text-sm text-muted-foreground">Account SID</label>
                <Input name="tw_sid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">Auth Token</label>
                <Input name="tw_token" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">From Number</label>
                <Input name="tw_from" placeholder="+15555551234" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={skip}>Skip</Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}
          {step === 'aws' && (
            <form className="space-y-3" method="post" onSubmit={saveAws}>
              <div>
                <label className="block text-sm text-muted-foreground">Region</label>
                <Input name="aws_region" placeholder="us-east-1" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">SES From Address</label>
                <Input name="aws_ses_from" placeholder="no-reply@your-domain.com" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">Access Key ID (optional; prefer roles)</label>
                <Input name="aws_access_key_id" placeholder="AKIA..." />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">Secret Access Key (optional)</label>
                <Input name="aws_secret_access_key" placeholder="••••••••" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={skip}>Skip</Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
