'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Input } from '@/components/ui/input'

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
  return (
    <Link className="px-2 py-1 rounded hover:bg-gray-100 underline-offset-2 hover:underline" href={href}>
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
  const [apiBase, setApiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001')
  const [orgId, setOrgId] = useLocalStorage<string>('orgId', 'demo')
  const [roles, setRoles] = useLocalStorage<string>('roles', 'org')
  const canAdmin = roles.split(',').map((s) => s.trim()).includes('org')
  return (
    <div className="grid grid-cols-[280px_1fr] min-h-screen">
      <aside className="border-r p-4 space-y-3 bg-white">
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
          </Section>
          <Section title="Billing & Analytics" icon={Icons.billing}>
            <MenuLink href="/admin/pricing">Pricing Rules</MenuLink>
            <MenuLink href="/admin/pricing/test">Pricing Simulator</MenuLink>
            <MenuLink href="/admin/usage">Usage</MenuLink>
          </Section>
          <Section title="Governance" icon={Icons.shield}>
            <MenuLink href="/admin/compliance">Compliance</MenuLink>
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
      </aside>
      <main className="p-6">{children}</main>
    </div>
  )
}
