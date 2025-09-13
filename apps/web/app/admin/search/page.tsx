"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [project, setProject] = useState('')
  const [projects, setProjects] = useState<any[]>([])

  async function loadProjects() {
    const r = await fetch('/api/projects/mine')
    const data = await r.json()
    setProjects(data.rows || [])
  }
  const [loading, setLoading] = useState(false)
  const { success, error: toastError } = useToast()

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: q, k: 5, project_code: project || undefined }),
    })
    const data = await r.json().catch(()=>({ matches: [] }))
    setRows(data.matches || [])
    if (!r.ok) { toastError('Search failed') } else { success(`Found ${data.matches?.length || 0} results`) }
    setLoading(false)
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Semantic Search</h1>
      <form method="post" onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
        <Select value={project} onChange={(e)=>setProject((e.target as HTMLSelectElement).value)} onFocus={() => { if (!projects.length) loadProjects() }}>
          <option value="">Select project (optional)</option>
          {projects.map((p:any)=>(<option key={p.id} value={p.code||''}>{p.name}{p.code?` (${p.code})`:''}</option>))}
        </Select>
        <Button disabled={loading} type="submit">{loading ? 'Searching...' : 'Search'}</Button>
      </form>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="p-3 border rounded-md">
            <div className="text-xs text-muted-foreground">doc {r.document_id} · score {Number(r.score).toFixed(3)}</div>
            <div className="mt-2 whitespace-pre-wrap">{r.content_redacted}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
