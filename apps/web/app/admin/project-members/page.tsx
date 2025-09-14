import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ProjectFilter from '@/components/admin/forms/ProjectFilter'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import ProjectMemberAddForm from '@/components/admin/forms/ProjectMemberAddForm'
import { revalidatePath } from 'next/cache'

export default async function ProjectMembersPage({ searchParams }: { searchParams?: { project?: string } }) {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/project-members')
  if (!session.roles.includes('org') && !session.roles.includes('admin')) redirect('/unauthorized')

  const [projRes, rolesRes] = await Promise.all([apiFetch('/projects/mine'), apiFetch('/roles')])
  const projects = (await projRes.json()).rows || []
  const roles = (await rolesRes.json()).rows || []
  const projectCode = searchParams?.project || ''
  const listRes = projectCode ? await apiFetch(`/project-members?projectCode=${encodeURIComponent(projectCode)}`) : null
  const rows: any[] = listRes ? (await listRes.json()).rows || [] : []

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Project Members</h1>

      <ProjectFilter projects={projects} projectCode={projectCode} />

      <ProjectMemberAddForm projectCode={projectCode} roles={roles} />

      {projectCode && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><tr><TableHead>Email</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Since</TableHead></tr></TableHeader>
            <TableBody>
              {rows.map((r:any)=>(
                <TableRow key={r.user_id}>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.username||''}</TableCell>
                  <TableCell>{r.role}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString('en-US',{ timeZone:'UTC' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  )
}
