"use client"
import * as React from 'react'
import { Button } from '@/components/ui/button'
import SearchableRSelect from '@/components/ui/searchable-rselect'

export default function ProjectFilter({ projects, projectCode }: { projects: any[]; projectCode: string }){
  const [value, setValue] = React.useState(projectCode || '')
  return (
    <form method="get" className="flex gap-2 items-end">
      <div className="grow">
        <label className="block text-sm text-muted-foreground">Select Project</label>
        <input type="hidden" name="project" value={value} />
        <SearchableRSelect
          value={value}
          onValueChange={setValue}
          placeholder="Choose a project…"
          items={[{value:'',label:'Choose a project…'}, ...projects.map((p:any)=>({ value: p.code||'', label: `${p.name}${p.code?` (${p.code})`:''}` }))]}
        />
      </div>
      <Button type="submit">Load</Button>
    </form>
  )
}
