"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TaskComposer(){
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string|undefined>()
  const router = useRouter()
  async function submit(){
    setError(undefined)
    const s = subject.trim(); const b = body.trim()
    if (s.length < 5) { setError('Subject is required (min 5 chars).'); return }
    if (b.length < 20) { setError('Body is required (min 20 chars).'); return }
    setSubmitting(true)
    try {
      const task = `${s}\n\n${b}`
      const r = await fetch('/api/agents/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task }) })
      if (!r.ok) throw new Error(await r.text())
      setSubject(''); setBody('')
      router.refresh()
    } catch (e:any) {
      setError(String(e?.message || e))
    } finally { setSubmitting(false) }
  }
  return (
    <div className="grid gap-2">
      <label className="text-sm">Subject (title)
        <input className="mt-1 border rounded h-9 px-2 w-full" value={subject} onChange={e=>setSubject((e.target as HTMLInputElement).value)} placeholder="e.g., RPS → FastAPI: Discovery and ADR" />
      </label>
      <label className="text-sm">Body (supports basic Markdown)
        <textarea className="mt-1 border rounded px-2 py-1 w-full h-28" value={body} onChange={e=>setBody((e.target as HTMLTextAreaElement).value)} placeholder="Describe the scope, deliverables, risks, and inputs needed."></textarea>
      </label>
      {error && (<div className="text-xs text-red-600">{error}</div>)}
      <div>
        <button disabled={submitting} onClick={submit} className="border rounded h-9 px-3 bg-white hover:bg-gray-50">{submitting? 'Queuing…' : 'Queue'}</button>
      </div>
    </div>
  )
}

