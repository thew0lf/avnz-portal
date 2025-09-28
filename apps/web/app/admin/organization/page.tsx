import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import OrgEditForm from './ui/OrgEditForm'
import ClientCreateForm from '@/components/admin/forms/ClientCreateForm'
import ClientsTable from '../clients/ClientsTable'
import OrgAuditTable from './ui/OrgAuditTable'
import UpdateManagerForm from '@/components/admin/forms/UpdateManagerForm'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function OrganizationPage({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }){
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/organization')
  const isOrgManager = (session.roles || []).includes('org')
  if (!isOrgManager) redirect('/admin')
  // Load orgs (for future multi-org support)
  const res = await apiFetch('/orgs/mine')
  const { rows = [] } = await res.json().catch(()=>({rows:[]}))
  const current = rows[0] || null
  // Load clients similar to /admin/clients for convenience
  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const cRes = await apiFetch(`/clients?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const cData = await cRes.json().catch(() => ({ rows: [] }))
  const clientRows = cData.rows || []
  // Load audit log (org managers only)
  const aParams = new URLSearchParams()
  if (searchParams?.action) aParams.set('action', searchParams.action)
  if (searchParams?.entity) aParams.set('entity', searchParams.entity)
  if (searchParams?.from) aParams.set('from', searchParams.from)
  if (searchParams?.to) aParams.set('to', searchParams.to)
  const baseQs = aParams.toString()
  const aRes = await apiFetch(`/orgs/audit${baseQs ? `?${baseQs}` : ''}`)
  const audit = (await aRes.json().catch(()=>({rows:[]}))).rows || []
  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Org Management</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border bg-white p-4">
          <h2 className="text-base font-medium mb-2">Edit organization</h2>
          <OrgEditForm org={current} />
        </div>
        <div className="rounded-md border bg-white p-4">
          <h2 className="text-base font-medium mb-2">Organization info</h2>
          {current ? (
            <div className="text-sm"><div><span className="text-muted-foreground">Name:</span> {current.name}</div></div>
          ) : (
            <div className="text-sm text-muted-foreground">No organization found for your membership.</div>
          )}
        </div>
      </div>

      {/* Mirror clients features here for org managers */}
      <div className="grid gap-6">
        <div className="rounded-md border bg-white p-4">
          <h2 className="text-base font-medium mb-2">Create client</h2>
          <ClientCreateForm />
        </div>
        <div className="rounded-md border bg-white p-4">
          <h2 className="text-base font-medium mb-2">Find clients</h2>
          <form action="/admin/organization" className="flex gap-2 items-end">
            <Input name="q" placeholder="Search clients" defaultValue={q} className="w-full md:w-64" />
            <Button type="submit">Search</Button>
          </form>
        </div>
        <div className="rounded-md border bg-white p-4">
          <h2 className="text-base font-medium mb-2">All clients</h2>
          <ClientsTable rows={clientRows} />
        </div>
        <div className="rounded-md border bg-white p-4">
          <h2 className="text-base font-medium mb-2">Manage client managers</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Set Manager (email/username)</th></tr>
              </thead>
              <tbody>
                {clientRows.map((r:any)=>(
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.code}</td>
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4"><UpdateManagerForm clientId={r.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white p-4">
        <h2 className="text-base font-medium mb-2">Audit log</h2>
        <form action="/admin/organization" className="grid gap-2 md:grid-cols-5 items-end mb-3">
          <div>
            <label className="block text-sm text-muted-foreground">Action</label>
            <Input name="action" defaultValue={searchParams?.action || ''} placeholder="e.g., update" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">Entity</label>
            <Input name="entity" defaultValue={searchParams?.entity || ''} placeholder="e.g., organization" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">From</label>
            <Input type="date" name="from" defaultValue={searchParams?.from || ''} />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">To</label>
            <Input type="date" name="to" defaultValue={searchParams?.to || ''} />
          </div>
          <div><Button type="submit">Filter</Button></div>
        </form>
        <OrgAuditTable rows={audit} baseQuery={baseQs ? `?${baseQs}` : ''} />
      </div>
    </main>
  )
}
