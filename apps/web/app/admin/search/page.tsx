"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Semantic Search</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Query</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <form method="post" onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <Input value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="Search..." />
            <SearchableRSelect
              value={project}
              onValueChange={setProject}
              placeholder="Select project (optional)"
              items={[{value:'',label:'Select project (optional)'}, ...projects.map((p:any)=>({ value: p.code||'', label: `${p.name}${p.code?` (${p.code})`:''}` }))]}
            />
            <Button disabled={loading} type="submit">{loading ? 'Searching...' : 'Search'}</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <Card key={i}>
            <CardHeader className="px-4 py-2"><div className="text-xs text-muted-foreground">doc {r.document_id} · score {Number(r.score).toFixed(3)}</div></CardHeader>
            <CardContent className="p-4 pt-0"><div className="whitespace-pre-wrap">{r.content_redacted}</div></CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
