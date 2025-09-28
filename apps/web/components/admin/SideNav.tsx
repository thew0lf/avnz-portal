"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }){
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border rounded-md">
      <button type="button" onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50" aria-expanded={open}>
        <span className="font-medium">{title}</span>
        <span className="text-xs text-gray-500">{open ? '▾' : '▸'}</span>
      </button>
      {open && (<div className="px-3 pb-2 pt-1 grid gap-1">{children}</div>)}
    </div>
  )
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }){
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href} className={`px-2 py-1 touchable rounded underline-offset-2 ${active ? 'bg-gray-100 font-medium' : 'hover:bg-gray-100 hover:underline'}`}>{children}</Link>
  )
}

export default function AdminSideNav({ canAdmin = false }: { canAdmin?: boolean }){
  return (
    <aside className="hidden md:block w-[260px] flex-shrink-0">
      <div className="grid gap-2">
        {canAdmin && (
          <Section title="Org Management">
            <MenuLink href="/admin/organization">Organization</MenuLink>
          </Section>
        )}
        <Section title="Overview">
          <MenuLink href="/admin">Dashboard</MenuLink>
          <MenuLink href="/admin/dashboard/tasks">Tasks</MenuLink>
          <MenuLink href="/admin/dashboard/jira">Jira</MenuLink>
        </Section>
        <Section title="Tenants">
          <MenuLink href="/admin/clients">Clients</MenuLink>
          <MenuLink href="/admin/clients/manage">Manage Client Managers</MenuLink>
        </Section>
        <Section title="Projects">
          <MenuLink href="/admin/projects">Projects</MenuLink>
          <MenuLink href="/admin/project-members">Project Members</MenuLink>
          <MenuLink href="/admin/documents">Documents</MenuLink>
          <MenuLink href="/admin/search">Search</MenuLink>
        </Section>
        <Section title="Access Control">
          <MenuLink href="/admin/members">Members</MenuLink>
          <MenuLink href="/admin/roles">Roles &amp; Permissions</MenuLink>
          <MenuLink href="/admin/invites">Invites</MenuLink>
          <MenuLink href="/admin/authz/roles">AuthZ Roles</MenuLink>
          <MenuLink href="/admin/authz/actions">AuthZ Actions</MenuLink>
          <MenuLink href="/admin/authz/permissions">AuthZ Permissions</MenuLink>
          <MenuLink href="/admin/authz/nodes">AuthZ Nodes</MenuLink>
          <MenuLink href="/admin/authz/routes">AuthZ Routes</MenuLink>
        </Section>
        <Section title="Security">
          <MenuLink href="/admin/security">Security Settings</MenuLink>
          <MenuLink href="/admin/secrets">Service Secrets</MenuLink>
        </Section>
        <Section title="Billing & Analytics">
          <MenuLink href="/admin/dashboard/billing/reports">Billing</MenuLink>
          <MenuLink href="/admin/dashboard/billing/manager">Manager</MenuLink>
          <MenuLink href="/admin/pricing">Pricing Rules</MenuLink>
          <MenuLink href="/admin/pricing/test">Pricing Simulator</MenuLink>
          <MenuLink href="/admin/usage">Usage</MenuLink>
        </Section>
        <Section title="Governance">
          <MenuLink href="/admin/compliance">Compliance</MenuLink>
          <MenuLink href="/admin/templates">Templates</MenuLink>
        </Section>
      </div>
    </aside>
  )
}
