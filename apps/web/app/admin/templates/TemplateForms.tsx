"use client"
import * as React from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ActionButton } from '@/components/admin/ActionButton'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import EmailMjmlEditor from '@/components/admin/EmailMjmlEditor'

function Section({ children, title }: { children: React.ReactNode; title: string }){
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function TemplateForms({ nodeId, clients, emailTemplates, smsTemplates, currentUserEmail }: any){
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
  const [edit, setEdit] = React.useState<any | null>(null)
  const [formKey, setFormKey] = React.useState<string>('new')
  const [previewTo, setPreviewTo] = React.useState<string>(currentUserEmail || '')
  const [sending, setSending] = React.useState(false)
  const [copyNew, setCopyNew] = React.useState<boolean>(false)
  const keyToName = React.useMemo(()=>{
    const m: Record<string,string> = {}
    for (const c of clients||[]) m[c.id] = c.name
    return m
  },[clients])
  async function loadDefault(key: string){
    try {
      const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path: `/admin/templates/email?nodeId=${encodeURIComponent(nodeId)}&key=${encodeURIComponent(key)}`, method: 'GET' }) })
      if (!r.ok) { error('Failed to load default'); return }
      const d = await r.json()
      const row = (d.rows||[])[0]
      if (!row) { error('No default found'); return }
      setEdit(row)
      setEmailClientId(row.client_id||'')
      setFormKey(`default-${key}`)
      success(`Loaded ${key} default`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { error('Failed to load default') }
  }
  const [mjml, setMjml] = React.useState<string|undefined>(undefined)
  const [html, setHtml] = React.useState<string>('')
  const [text, setText] = React.useState<string>('')
  const emailFormRef = React.useRef<HTMLFormElement>(null)
  const bodyRef = React.useRef<HTMLTextAreaElement>(null)
  async function upsertEmail(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // Prefer MJML/HTML editor output when available
    const payload:any = { id: fd.get('id')||undefined, key: String(fd.get('key')||''), client_id: String(fd.get('client_id')||'')||undefined, subject: String(fd.get('subject')||'') }
    if (copyNew) delete payload.id
    const bodyText = String(fd.get('body')||'')
    payload.body = text || bodyText
    if (html) payload.body_html = html
    if (mjml) payload.body_mjml = mjml
    const body = { ...payload, nodeId }
    const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/templates/email', method:'POST', body }) })
    if (r.ok) success('Email template saved'); else error('We couldn’t save the template. Please try again.')
  }
  async function upsertSms(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body:any = { key: String(fd.get('key')||''), client_id: String(fd.get('client_id')||'')||undefined, body: String(fd.get('body')||''), nodeId }
    const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/templates/sms', method:'POST', body }) })
    if (r.ok) success('SMS template saved'); else error('We couldn’t save the template. Please try again.')
  }
  return (
    <div className="space-y-8">
      <Section title="Email Templates">
        <form ref={emailFormRef} key={formKey} method="post" onSubmit={upsertEmail} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
          <input type="hidden" name="id" value={edit?.id || ''} />
          <div><label className="block text-sm text-muted-foreground">Key</label><Input name="key" placeholder="invite" defaultValue={edit?.key || 'invite'} /></div>
          <div>
            <label className="block text-sm text-muted-foreground">Client (optional)</label>
            <input type="hidden" name="client_id" value={emailClientId} />
            <SearchableRSelect
              value={emailClientId || edit?.client_id || ''}
              onValueChange={setEmailClientId}
              placeholder="Default (all clients)"
              items={[{value:'',label:'Default (all clients)'}, ...clients.map((c:any)=>({ value:c.id, label:c.name }))]}
            />
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="grow">
              <label className="block text-sm text-muted-foreground">Subject</label>
              <Input name="subject" placeholder="Subject" defaultValue={edit?.subject || ''} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={()=>loadDefault('invite')}>Load default: invite</Button>
              <Button variant="outline" type="button" onClick={()=>loadDefault('password_reset')}>Load default: password_reset</Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full">
                <label className="block text-sm text-muted-foreground">Load existing</label>
                <SearchableRSelect
                  placeholder="Choose existing"
                  value=""
                  onValueChange={(val)=>{
                    const row = (emailTemplates||[]).find((t:any)=> String(t.id) === String(val))
                    if (row) { setEdit(row); setEmailClientId(row.client_id||''); setFormKey(String(row.id)); success('Loaded existing template'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
                  }}
                  items={(emailTemplates||[]).map((t:any)=>({ value: t.id, label: `${t.key} — ${t.client_id? (keyToName[t.client_id]||t.client_id):'default'}` }))}
                />
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm text-muted-foreground">Email Content (GrapesJS + MJML)</label>
            <EmailMjmlEditor initialMjml={edit?.body_mjml} initialHtml={edit?.body_html} onExport={({ mjml, html, text })=>{ setMjml(mjml); setHtml(html); setText(text); try{ if (bodyRef.current) bodyRef.current.value = text }catch{} }} />
            <div className="text-xs text-muted-foreground">Variables supported: {'{{url}}, {{clientName}}, {{orgName}}, {{orgNameSuffix}}'}</div>
            {/* Fallback plain-text body (used if MJML editor not used) */}
            <textarea ref={bodyRef} name="body" className="border rounded w-full h-24 p-2 text-sm" placeholder="Plain text body (optional)" defaultValue={edit?.body || ''}></textarea>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit">Save Email Template</Button>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={copyNew} onChange={e=>setCopyNew((e.target as HTMLInputElement).checked)} /> Save as new (copy)</label>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <div className="w-full md:w-64">
              <label className="block text-sm text-muted-foreground">Preview send to</label>
              <Input type="email" placeholder="you@example.com" value={previewTo} onChange={(e)=>setPreviewTo((e.target as HTMLInputElement).value)} />
            </div>
            <Button type="button" variant="outline" disabled={sending} onClick={async()=>{
              if (!previewTo) { error('Enter an email to preview'); return }
              setSending(true)
              try {
                const fd = new FormData(emailFormRef.current || undefined)
                const subject = String(fd.get('subject')||'')
                const client_id = String(fd.get('client_id')||'')||undefined
                const bodyText = String(fd.get('body')||'')
                const body = text || bodyText
                const body_html = html || undefined
                const payload:any = { to: previewTo, subject, body, body_html, client_id }
                const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/templates/email/preview', method:'POST', body: { ...payload, nodeId } }) })
                if (r.ok) { let from=''; try{ const d=await r.json(); from=d?.from||'' }catch{}; success(from?`Preview sent from ${from}`:'Preview sent') } else error('Preview failed')
              } finally { setSending(false) }
            }}>{sending?'Sending…':'Send Preview'}</Button>
            <Button type="button" variant="secondary" disabled={sending} onClick={async()=>{
              if (!currentUserEmail) { error('No user email available'); return }
              setPreviewTo(currentUserEmail)
              // trigger the same send path
              const click = document.createEvent('MouseEvents'); click.initEvent('click', true, true)
              ;(document.activeElement as HTMLElement)?.blur?.()
              // Call the onClick of the previous button programmatically by reusing logic
              const btn = (document.querySelector('button[type=button][disabled]') as HTMLButtonElement) // noop safe
              // Fallback: duplicate code path
              setSending(true)
              try {
                const fd = new FormData(emailFormRef.current || undefined)
                const subject = String(fd.get('subject')||'')
                const client_id = String(fd.get('client_id')||'')||undefined
                const bodyText = String(fd.get('body')||'')
                const body = text || bodyText
                const body_html = html || undefined
                const payload:any = { to: currentUserEmail, subject, body, body_html, client_id }
                const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/templates/email/preview', method:'POST', body: { ...payload, nodeId } }) })
                if (r.ok) { let from=''; try{ const d=await r.json(); from=d?.from||'' }catch{}; success(from?`Preview sent to you from ${from}`:'Preview sent to you') } else error('Preview failed')
              } finally { setSending(false) }
            }}>Send to me</Button>
          </div>
        </form>
        {edit && (
          <div className="mt-2 text-xs text-muted-foreground">
            Editing: {edit.client_id ? `Override for ${keyToName[edit.client_id]||edit.client_id}` : 'Default (all clients)'}
          </div>
        )}
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
                  <TableCell className="flex items-center gap-2">{t.key} {t.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</TableCell>
                  <TableCell>{t.client_id || 'default'}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={()=>{ setEdit(t); setEmailClientId(t.client_id||''); setFormKey(String(t.id)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</Button>
                    {t.deleted_at ? (
                      <ActionButton variant="secondary" label="Restore" method="POST" path={`/admin/templates/email/${encodeURIComponent(t.id)}/restore`} body={{ nodeId }} />
                    ) : (
                      <ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/email/${encodeURIComponent(t.id)}`} body={{ nodeId }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden grid gap-2">
          {emailTemplates.map((t:any)=>(
            <div key={t.id} className="rounded border bg-white p-3">
              <div className="text-sm font-medium flex items-center gap-2">{t.key} {t.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</div>
              <div className="text-xs text-muted-foreground">Client: {t.client_id || 'default'}</div>
              <div className="text-xs truncate">{t.subject}</div>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={()=>{ setEdit(t); setEmailClientId(t.client_id||''); setFormKey(String(t.id)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</Button>
                {t.deleted_at ? (
                  <ActionButton variant="secondary" label="Restore" method="POST" path={`/admin/templates/email/${encodeURIComponent(t.id)}/restore`} body={{ nodeId }} />
                ) : (
                  <ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/email/${encodeURIComponent(t.id)}`} body={{ nodeId }} />
                )}
              </div>
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
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
            <div className="md:col-span-2">
              <label className="block text-sm text-muted-foreground">Body</label>
              <textarea name="body" className="border rounded w-full h-32 p-2 text-sm" placeholder="Body with {{url}}, {{clientName}}"></textarea>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={()=>{ (document.querySelector('textarea[name=body]') as HTMLTextAreaElement).value = 'Use this link to continue: {{url}}' }}>Load default: invite</Button>
              <div className="w-full">
                <label className="block text-sm text-muted-foreground">Load existing</label>
                <SearchableRSelect
                  placeholder="Choose existing"
                  value=""
                  onValueChange={(val)=>{
                    const row = (smsTemplates||[]).find((t:any)=> String(t.id) === String(val))
                    if (row) { const el = (document.querySelector('textarea[name=body]') as HTMLTextAreaElement); if (el) el.value = row.body||''; success('Loaded existing SMS') }
                  }}
                  items={(smsTemplates||[]).map((t:any)=>({ value: t.id, label: `${t.key} — ${t.client_id? (keyToName[t.client_id]||t.client_id):'default'}` }))}
                />
              </div>
            </div>
          </div>
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
                  <TableCell className="flex items-center gap-2">{t.key} {t.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</TableCell>
                  <TableCell>{t.client_id || 'default'}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{t.body}</TableCell>
                  <TableCell>{t.deleted_at ? <ActionButton variant="secondary" label="Restore" method="POST" path={`/admin/templates/sms/${encodeURIComponent(t.id)}/restore`} body={{ nodeId }} /> : <ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/sms/${encodeURIComponent(t.id)}`} body={{ nodeId }} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden grid gap-2">
          {smsTemplates.map((t:any)=>(
            <div key={t.id} className="rounded border bg-white p-3">
              <div className="text-sm font-medium flex items-center gap-2">{t.key} {t.deleted_at ? <span className="text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Deleted</span> : null}</div>
              <div className="text-xs text-muted-foreground">Client: {t.client_id || 'default'}</div>
              <div className="text-xs whitespace-pre-wrap break-words">{t.body}</div>
              <div className="mt-2">{t.deleted_at ? <ActionButton variant="secondary" label="Restore" method="POST" path={`/admin/templates/sms/${encodeURIComponent(t.id)}/restore`} body={{ nodeId }} /> : <ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/sms/${encodeURIComponent(t.id)}`} body={{ nodeId }} />}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
