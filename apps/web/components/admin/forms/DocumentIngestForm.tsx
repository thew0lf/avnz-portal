"use client"
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import SearchableRSelect from '@/components/ui/searchable-rselect'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-provider'

export default function DocumentIngestForm({ projects }: { projects: Array<any> }){
  const [file, setFile] = useState<File | null>(null)
  const [project, setProject] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error: toastError } = useToast()
  async function onSubmit(e: React.FormEvent){
    e.preventDefault()
    if (!file) { toastError('Please choose a file'); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    if (project) fd.append('project_code', project)
    const r = await fetch('/api/ai/ingest', { method: 'POST', body: fd })
    if (!r.ok) { let msg = 'Upload failed'; try { const d=await r.json(); msg = d?.error || d?.message || msg } catch {} toastError(msg) } else { success('Upload started') }
    setLoading(false)
  }
  return (
    <form method="post" encType="multipart/form-data" className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input id="file" name="file" type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project_code">Project (optional)</Label>
        <input type="hidden" name="project_code" value={project} />
        <SearchableRSelect
          value={project}
          onValueChange={setProject}
          placeholder="Select a project..."
          items={[{value:'',label:'Select a project...'}, ...projects.map((p:any)=>({ value: p.code||'', label: `${p.name}${p.code?` (${p.code})`:''}` }))]}
        />
      </div>
      <Button type="submit" disabled={loading}>{loading? 'Uploading...' : 'Upload'}</Button>
    </form>
  )
}
