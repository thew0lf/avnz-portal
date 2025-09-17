import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, CommonColumn, makeActionsColumn, makeDragColumn, makeSelectionColumn } from '@/components/ui/data-table'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import ClientCreateForm from '@/components/admin/forms/ClientCreateForm'
import { revalidatePath } from 'next/cache'

export default async function ClientsPage({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }) {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/clients')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/clients?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(() => ({ rows: [] }))
  const rows = data.rows || []
  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
  const columns: CommonColumn<any>[] = [
    makeSelectionColumn(),
    makeDragColumn(),
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
    { accessorKey: 'manager_email', header: 'Manager', cell: ({ row }) => row.original.manager_email || '-' },
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('en-US', { timeZone: 'UTC' }) },
    makeActionsColumn({ viewHref: (r:any)=>'/admin/clients/manage' }),
  ]
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Clients</h1></div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Create client</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <ClientCreateForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Find clients</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <form action="/admin/clients" className="flex gap-2 items-end">
            <Input name="q" placeholder="Search clients" defaultValue={q} className="w-full md:w-64" />
            <Button type="submit">Search</Button>
          </form>
          {q && (<div className="mt-2"><Badge variant="secondary">Search: {q}</Badge></div>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">All clients</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <DataTable data={rows} columns={columns} enableDnD />
        </CardContent>
      </Card>
    </main>
  )
}
