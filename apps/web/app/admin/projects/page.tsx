import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import ProjectCreateForm from '@/components/admin/forms/ProjectCreateForm'

export default async function ProjectsPage({ searchParams }: { searchParams?: { q?: string, offset?: string, limit?: string } }) {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/projects')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const q = searchParams?.q || ''
  const limit = Number(searchParams?.limit || '20')
  const offset = Number(searchParams?.offset || '0')
  const res = await apiFetch(`/projects?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
  const data = await res.json().catch(() => ({ rows: [] }))
  const rows = data.rows || []
  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
      </div>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Create project</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <ProjectCreateForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">Find projects</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <form action="/admin/projects" className="flex gap-2 items-end">
            <Input name="q" placeholder="Search projects" defaultValue={q} className="w-full md:w-64" />
            <Button type="submit">Search</Button>
          </form>
          {q && (<div className="mt-2"><Badge variant="secondary">Search: {q}</Badge></div>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 py-3"><CardTitle className="text-base">All projects</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Client</TableHead><TableHead>Created</TableHead></tr>
              </TableHeader>
              <TableBody>
                {rows.map((r:any)=>(
                  <TableRow key={r.id}>
                    <TableCell>{r.code||''}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.client_code||''}</TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString('en-US',{ timeZone:'UTC' })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center mt-3 px-4 pb-4">
            <a className="underline" href={`/admin/projects?q=${encodeURIComponent(q)}&limit=${limit}&offset=${prevOffset}`}>Prev</a>
            <span className="text-sm text-muted-foreground">Showing {rows.length} rows</span>
            <a className="underline" href={`/admin/projects?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`}>Next</a>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
