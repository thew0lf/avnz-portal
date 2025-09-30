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
    const body:any = { key: String(fd.get('key')||''), client_id: String(fd.get('client_id')||'')||undefined, body: String(fd.get('body')||'') }
    const r = await fetch('/api/admin/proxy', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path:'/admin/templates/sms', method:'POST', body }) })
    if (r.ok) success('SMS template saved'); else error('We couldn’t save the template. Please try again.')
  }
  return (
    <div className="space-y-4">
      <form method="post" onSubmit={upsertEmail} className="grid grid-cols-1 gap-4">
        <Input name="key" placeholder="Template Key" required />
        <Input name="subject" placeholder="Email Subject" required />
        <textarea name="body" ref={bodyRef} placeholder="Email Body" required />
        <Button type="submit">Save Email Template</Button>
      </form>
      <form method="post" onSubmit={upsertSms} className="grid grid-cols-1 gap-4">
        <Input name="key" placeholder="Template Key" required />
        <Input name="client_id" placeholder="Client ID" />
        <textarea name="body" placeholder="SMS Body" required />
        <Button type="submit">Save SMS Template</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emailTemplates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>{template.key}</TableCell>
              <TableCell>{keyToName[template.client_id] || 'Global'}</TableCell>
              <TableCell>
                <ActionButton variant="secondary" label="Edit" method="GET" path={`/admin/templates/email/${template.id}/edit`} />
                <ActionButton variant="secondary" label="Delete" method="DELETE" path={`/admin/templates/email/${template.id}`} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
