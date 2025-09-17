"use client"
import * as React from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ActionButton } from '@/components/admin/ActionButton'
import SearchableRSelect from '@/components/ui/searchable-rselect'

function Section({ children, title }: { children: React.ReactNode; title: string }){
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function TemplateForms({ clients, emailTemplates, smsTemplates }: any){
  const { success, error } = useToast()
  const clientGroups = React.useMemo(()=>{
    const groups: Record<string, any[]> = {}
    for (const c of clients||[]) {
      const k = String(c.name||'').charAt(0).toUpperCase() || '#'
      if (!groups[k]) groups[k] = []
      groups[k].push(c)
    }
    return Object.entries(groups).sort(([a],[b])=>a.localeCompare(b))
  },[clients])
  const [emailClientId, setEmailClientId] = React.useState('')
  const [smsClientId, setSmsClientId] = React.useState('')
  async function upsertEmail(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body:any = { key: String(fd.get('key')||''), client_id: String(fd.get('client_id')||'')||undefined, subject: String(fd.get('subject')||''), body: String(fd.get('body')||'') }
    const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/templates/email', method:'POST', body }) })
    if (r.ok) success('Email template saved'); else error('We couldn’t save the template. Please try again.')
  }
  async function upsertSms(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body:any = { key: String(fd.get('key')||''), client_id: String(fd.get('client_id')||'')||undefined, body: String(fd.get('body')||'') }
    const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/templates/sms', method:'POST', body }) })
    if (r.ok) success('SMS template saved'); else error('We couldn’t save the template. Please try again.')
  }
  return (
    <div className="space-y-8">
      <Section title="Email Templates">
        <form method="post" onSubmit={upsertEmail} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
          <div><label className="block text-sm text-muted-foreground">Key</label><Input name="key" placeholder="invite" defaultValue="invite" /></div>
          <div>
            <label className="block text-sm text-muted-foreground">Client (optional)</label>
            <input type="hidden" name="client_id" value={emailClientId} />
            <SearchableRSelect
              value={emailClientId}
              onValueChange={setEmailClientId}
              placeholder="Default (all clients)"
              items={[{value:'',label:'Default (all clients)'}, ...clients.map((c:any)=>({ value:c.id, label:c.name }))]}
            />
          </div>
          <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">Subject</label><Input name="subject" placeholder="Subject" /></div>
          <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">Body (text)</label><textarea name="body" className="border rounded w-full h-32 p-2 text-sm" placeholder="Body text with {{url}}, {{clientName}}, {{orgName}}"></textarea></div>
          <div className="md:col-span-2"><Button type="submit">Save Email Template</Button></div>
        </form>
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailTemplates.map((t:any)=>(
                <TableRow key={t.id}>
                  <TableCell>{t.key}</TableCell>
                  <TableCell>{t.client_id || 'default'}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell><ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/email/${encodeURIComponent(t.id)}`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden grid gap-2">
          {emailTemplates.map((t:any)=>(
            <div key={t.id} className="rounded border bg-white p-3">
              <div className="text-sm font-medium">{t.key}</div>
              <div className="text-xs text-muted-foreground">Client: {t.client_id || 'default'}</div>
              <div className="text-xs truncate">{t.subject}</div>
              <div className="mt-2"><ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/email/${encodeURIComponent(t.id)}`} /></div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="SMS Templates">
        <form method="post" onSubmit={upsertSms} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
          <div><label className="block text-sm text-muted-foreground">Key</label><Input name="key" placeholder="invite" defaultValue="invite" /></div>
          <div>
            <label className="block text-sm text-muted-foreground">Client (optional)</label>
            <input type="hidden" name="client_id" value={smsClientId} />
            <SearchableRSelect
              value={smsClientId}
              onValueChange={setSmsClientId}
              placeholder="Default (all clients)"
              items={[{value:'',label:'Default (all clients)'}, ...clients.map((c:any)=>({ value:c.id, label:c.name }))]}
            />
          </div>
          <div className="md:col-span-2"><label className="block text-sm text-muted-foreground">Body</label><textarea name="body" className="border rounded w-full h-32 p-2 text-sm" placeholder="Body with {{url}}, {{clientName}}"></textarea></div>
          <div className="md:col-span-2"><Button type="submit">Save SMS Template</Button></div>
        </form>
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsTemplates.map((t:any)=>(
                <TableRow key={t.id}>
                  <TableCell>{t.key}</TableCell>
                  <TableCell>{t.client_id || 'default'}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{t.body}</TableCell>
                  <TableCell><ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/sms/${encodeURIComponent(t.id)}`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden grid gap-2">
          {smsTemplates.map((t:any)=>(
            <div key={t.id} className="rounded border bg-white p-3">
              <div className="text-sm font-medium">{t.key}</div>
              <div className="text-xs text-muted-foreground">Client: {t.client_id || 'default'}</div>
              <div className="text-xs whitespace-pre-wrap break-words">{t.body}</div>
              <div className="mt-2"><ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/sms/${encodeURIComponent(t.id)}`} /></div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

