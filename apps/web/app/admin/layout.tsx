'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLocalStorage } from './useLocalStorage'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

type SectionProps = {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>{icon}</span>
          <span className="font-medium">{title}</span>
        </span>
        <span className="text-xs text-gray-500">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-3 pb-2 pt-1 grid gap-1">{children}</div>}
    </div>
  )
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      className={`px-2 py-1 touchable rounded underline-offset-2 ${active ? 'bg-gray-100 font-medium' : 'hover:bg-gray-100 hover:underline'}`}
      href={href}
    >
      {children}
    </Link>
  )
}

const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  tenants: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V7l9-4 9 4v14"/><path d="M9 22V12h6v10"/>
    </svg>
  ),
  projects: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v4H3z"/><path d="M7 7v14M17 7v14"/><path d="M3 21h18"/>
    </svg>
  ),
  members: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  roles: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7z"/>
    </svg>
  ),
  docs: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  billing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
    </svg>
  ),
  usage: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M7 13l3 3 7-7"/>
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  invite: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 5 17 10"/>
      <line x1="12" y1="5" x2="12" y2="20"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 20.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 8c.36.33.57.8.51 1.29A1.65 1.65 0 0 0 22 11v2a1.65 1.65 0 0 0-1.09 1z"/>
    </svg>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [apiBase, setApiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001')
  const [orgId, setOrgId] = useLocalStorage<string>('orgId', '')
  const [roles, setRoles] = useLocalStorage<string>('roles', 'org')
  const [projectCode, setProjectCode] = useLocalStorage<string>('projectCode', '')
  const [projects, setProjects] = useState<any[]>([])
  // Avoid SSR/CSR mismatches: render after mount so localStorage-backed values don't differ
  useState(() => { /* noop to ensure hook order */ })
  useEffect(() => { setMounted(true) }, [])
  async function loadProjects(){
    try { const r = await fetch('/api/projects/mine'); const d = await r.json(); setProjects(d.rows||[]) } catch {}
  }
  const canAdmin = roles.split(',').map((s) => s.trim()).includes('org')
  return (
    <div className="grid md:grid-cols-[280px_1fr] min-h-screen">
      <aside className="hidden md:flex md:flex-col border-r p-4 space-y-3 bg-white min-h-screen sticky top-0">
        <div className="flex items-center gap-2">
          {Icons.dashboard}
          <h2 className="text-lg font-semibold">Admin Portal</h2>
        </div>
        <nav className="grid gap-2">
          <Section title="Overview" icon={Icons.dashboard}>
            <MenuLink href="/admin">Dashboard</MenuLink>
          </Section>
          <Section title="Tenants" icon={Icons.tenants}>
            <MenuLink href="/admin/clients">Clients</MenuLink>
            <MenuLink href="/admin/clients/manage">Manage Client Managers</MenuLink>
          </Section>
          <Section title="Projects" icon={Icons.projects}>
            <MenuLink href="/admin/projects">Projects</MenuLink>
            <MenuLink href="/admin/project-members">Project Members</MenuLink>
            <MenuLink href="/admin/documents">Documents</MenuLink>
            <MenuLink href="/admin/search">Search</MenuLink>
          </Section>
          <Section title="Access Control" icon={Icons.members}>
            <MenuLink href="/admin/members">Members</MenuLink>
            <MenuLink href="/admin/roles">Roles &amp; Permissions</MenuLink>
            <MenuLink href="/admin/invites">Invites</MenuLink>
            <MenuLink href="/admin/authz/roles">AuthZ Roles</MenuLink>
            <MenuLink href="/admin/authz/actions">AuthZ Actions</MenuLink>
            <MenuLink href="/admin/authz/permissions">AuthZ Permissions</MenuLink>
            <MenuLink href="/admin/authz/nodes">AuthZ Nodes</MenuLink>
            <MenuLink href="/admin/authz/routes">AuthZ Routes</MenuLink>
          </Section>
          <Section title="Security" icon={Icons.shield}>
            <MenuLink href="/admin/security">Security Settings</MenuLink>
            <MenuLink href="/admin/secrets">Service Secrets</MenuLink>
          </Section>
          <Section title="Billing & Analytics" icon={Icons.billing}>
            <MenuLink href="/admin/pricing">Pricing Rules</MenuLink>
            <MenuLink href="/admin/pricing/test">Pricing Simulator</MenuLink>
            <MenuLink href="/admin/usage">Usage</MenuLink>
          </Section>
          <Section title="Governance" icon={Icons.shield}>
            <MenuLink href="/admin/compliance">Compliance</MenuLink>
            <MenuLink href="/admin/templates">Templates</MenuLink>
          </Section>
          <Section title="Settings" icon={Icons.settings}>
            <label className="text-sm block mb-1">API Base<Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} /></label>
            <label className="text-sm block mb-1">Org ID<Input value={orgId} onChange={(e) => setOrgId(e.target.value)} /></label>
            <label className="text-sm block">Roles<Input value={roles} onChange={(e) => setRoles(e.target.value)} /></label>
            {!canAdmin && (
              <p className="text-xs text-red-600 mt-1">
                Note: You don't have the <b>org</b> role; creation/deletion will be blocked by API.
              </p>
            )}
          </Section>
        </nav>
        <div className="mt-auto pt-4 border-t">
          <div className="grid gap-2">
            <form action="/api/logout" method="post">
              <button type="submit" className="px-2 py-1 touchable rounded hover:bg-gray-100 underline-offset-2 hover:underline w-full text-left">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="container py-4 md:py-6" suppressHydrationWarning>
        <div className="flex items-center justify-between mb-4">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger className="touchable border rounded px-2 bg-white">Menu</SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-2">
                    {Icons.dashboard}
                    <h2 className="text-lg font-semibold">Admin Portal</h2>
                  </div>
                  <Accordion type="multiple" className="w-full">
                    <AccordionItem value="overview">
                      <AccordionTrigger>Overview</AccordionTrigger>
                      <AccordionContent>
                        <MenuLink href="/admin">Dashboard</MenuLink>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="tenants">
                      <AccordionTrigger>Tenants</AccordionTrigger>
                      <AccordionContent>
                        <MenuLink href="/admin/clients">Clients</MenuLink>
                        <MenuLink href="/admin/clients/manage">Manage Client Managers</MenuLink>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="projects">
                      <AccordionTrigger>Projects</AccordionTrigger>
                      <AccordionContent>
                        <MenuLink href="/admin/projects">Projects</MenuLink>
                        <MenuLink href="/admin/project-members">Project Members</MenuLink>
                        <MenuLink href="/admin/documents">Documents</MenuLink>
                        <MenuLink href="/admin/search">Search</MenuLink>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="access">
                      <AccordionTrigger>Access Control</AccordionTrigger>
                      <AccordionContent>
                        <MenuLink href="/admin/members">Members</MenuLink>
                        <MenuLink href="/admin/roles">Roles &amp; Permissions</MenuLink>
                        <MenuLink href="/admin/invites">Invites</MenuLink>
                        <MenuLink href="/admin/authz/roles">AuthZ Roles</MenuLink>
                        <MenuLink href="/admin/authz/actions">AuthZ Actions</MenuLink>
                        <MenuLink href="/admin/authz/permissions">AuthZ Permissions</MenuLink>
                        <MenuLink href="/admin/authz/nodes">AuthZ Nodes</MenuLink>
                        <MenuLink href="/admin/authz/routes">AuthZ Routes</MenuLink>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="security">
                      <AccordionTrigger>Security</AccordionTrigger>
                      <AccordionContent>
                        <MenuLink href="/admin/security">Security Settings</MenuLink>
                        <MenuLink href="/admin/secrets">Service Secrets</MenuLink>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="billing">
                      <AccordionTrigger>Billing & Analytics</AccordionTrigger>
                      <AccordionContent>
                        <MenuLink href="/admin/pricing">Pricing Rules</MenuLink>
                        <MenuLink href="/admin/pricing/test">Pricing Simulator</MenuLink>
                        <MenuLink href="/admin/usage">Usage</MenuLink>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="governance">
                      <AccordionTrigger>Governance</AccordionTrigger>
                      <AccordionContent>
                        <MenuLink href="/admin/compliance">Compliance</MenuLink>
                        <MenuLink href="/admin/templates">Templates</MenuLink>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <div className="pt-2"><SheetClose className="touchable border rounded px-2 w-full">Close</SheetClose></div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex flex-wrap min-w-0 items-center gap-3 text-sm text-muted-foreground">
            {mounted && (
              <Dropdown label="Org" storageKey="orgFilter" placeholder="All Orgs" showSelection={false} buttonText="Org" optionsProvider={async()=>{ try{ const r=await fetch('/api/orgs'); const d=await r.json(); return [{id:'',name:'All Orgs'}, ...((d.rows||[]).map((o:any)=>({ id:o.id, name:o.name })))] } catch { return [{id:'',name:'All Orgs'}] } }} />
            )}
            <span>/</span>
            {mounted && (
              <Dropdown label="Clients" storageKey="clientFilter" placeholder="All Clients" optionsProvider={async()=>{
                try { const r = await fetch('/api/clients'); const d = await r.json(); return [{id:'',name:'All Clients'}, ...((d.rows||[]).map((c:any)=>({id:c.id, name: c.name})))] } catch { return [{id:'',name:'All Clients'}] }
              }} />
            )}
            <span>/</span>
            {mounted && (<ProjectDropdown projectCode={projectCode} setProjectCode={setProjectCode} loadProjects={loadProjects} projects={projects} />)}
            <span>/</span>
            {mounted && (<UsersDropdown />)}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button className="px-2 py-1 rounded border">Export</button>
          </div>
        </div>
        {mounted ? children : null}
      </main>
    </div>
  )
}

function ProjectDropdown({ projectCode, setProjectCode, loadProjects, projects }: any){
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const filtered = projects.filter((p:any)=> (p.name||'').toLowerCase().includes(q.toLowerCase()) || (p.code||'').toLowerCase().includes(q.toLowerCase()))
  async function setContextProject(code: string){
    try { await fetch('/api/admin/context', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ projectCode: code }) }) } catch {}
  }
  return (
    <div className="relative inline-flex items-center gap-1 min-w-0">
      <span>Projects</span>
      <button className="border rounded h-8 px-2 bg-white max-w-[45vw] overflow-hidden text-ellipsis" onClick={()=>{ setOpen(!open); if(!projects.length) loadProjects() }}>{projectCode? (projects.find((p:any)=>String(p.code||'')===String(projectCode))?.name || 'Selected') : 'All Projects'}</button>
      {open && (
        <div className="absolute z-10 mt-1 w-64 bg-white border rounded shadow">
          <div className="p-2"><input className="w-full border rounded px-2 h-8" placeholder="Search projects" value={q} onChange={e=>setQ((e.target as HTMLInputElement).value)} /></div>
          <div className="max-h-64 overflow-auto">
            <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setProjectCode(''); setContextProject(''); setOpen(false) }}>All Projects</button>
            {filtered.map((p:any)=>(<button key={p.id} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ const code=String(p.code||''); setProjectCode(code); setContextProject(code); setOpen(false) }}>{p.name}{p.code?` (${p.code})`:''}</button>))}
          </div>
        </div>
      )}
    </div>
  )
}

function UsersDropdown(){
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [value, setValue] = useLocalStorage<string>('userFilter','')
  async function setContextUser(id: string){
    try { await fetch('/api/admin/context', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ userFilter: id }) }) } catch {}
  }
  async function load(){ if (items.length) return; try{ const r=await fetch('/api/memberships'); const d=await r.json(); setItems((d.rows||[]).map((m:any)=>({ id:m.user_id, name: m.email || m.username || m.user_id }))) } catch{} }
  const filtered = items.filter(i=> i.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="relative min-w-0">
      <button className="border rounded h-8 px-2 bg-white max-w-[45vw] overflow-hidden text-ellipsis" onClick={()=>{ setOpen(!open); if(!items.length) load() }}>Users</button>
      {open && (
        <div className="absolute z-10 mt-1 w-64 bg-white border rounded shadow">
          <div className="p-2"><input className="w-full border rounded px-2 h-8" placeholder="Search users" value={q} onChange={e=>setQ((e.target as HTMLInputElement).value)} /></div>
          <div className="max-h-64 overflow-auto">
            <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setValue(''); setContextUser(''); setOpen(false) }}>All Users</button>
            {filtered.map((i:any)=>(<button key={i.id} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setValue(i.id); setContextUser(i.id); setOpen(false) }}>{i.name}</button>))}
          </div>
        </div>
      )}
    </div>
  )
}

function Dropdown({ label, storageKey, placeholder, optionsProvider, showSelection = true, buttonText }:{ label:string; storageKey:string; placeholder:string; optionsProvider: ()=>Promise<any[]>; showSelection?: boolean; buttonText?: string }){
  const [items, setItems] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [value, setValue] = useLocalStorage<string>(storageKey,'')
  async function setContext(key: string, id: string){
    try { await fetch('/api/admin/context', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ [key]: id }) }) } catch {}
  }
  async function load(){ if (!items.length){ try{ const opts=await optionsProvider(); setItems(opts) } catch{} } }
  const filtered = items.filter((i:any)=> (i.name||'').toLowerCase().includes(q.toLowerCase()))
  const buttonLabel = buttonText || (showSelection ? (value? (items.find((i:any)=>String(i.id)===String(value))?.name || 'Selected') : placeholder) : label)
  return (
    <div className="inline-flex items-center gap-1 min-w-0">
      <span>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button className="border rounded h-8 px-2 bg-white max-w-[45vw] overflow-hidden text-ellipsis" onClick={()=>load()}>{buttonLabel}</button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="p-2"><input className="w-full border rounded px-2 h-8" placeholder={`Search ${label.toLowerCase()}`} value={q} onChange={e=>setQ((e.target as HTMLInputElement).value)} /></div>
          <div className="max-h-64 overflow-auto">
            <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setValue(''); setContext(storageKey, '') }}>{placeholder}</button>
            {filtered.map((i:any)=>(<button key={i.id} className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ const id=String(i.id); setValue(id); setContext(storageKey, id) }}>{i.name}</button>))}
          </div>
        </PopoverContent>
      </Popover>
      {!!value && <Badge variant="secondary">Set</Badge>}
    </div>
  )
}

// Mobile menu now uses shadcn-style Sheet in the header above
