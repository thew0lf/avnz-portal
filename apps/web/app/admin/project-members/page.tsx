import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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

      <form method="get" className="flex gap-2 items-end">
        <div className="grow">
          <label className="block text-sm text-muted-foreground">Select Project</label>
          <Select name="project" defaultValue={projectCode}>
            <option value="">Choose a project…</option>
            {projects.map((p:any)=>(<option key={p.id} value={p.code||''}>{p.name}{p.code?` (${p.code})`:''}</option>))}
          </Select>
        </div>
        <Button type="submit">Load</Button>
      </form>

      <ProjectMemberAddForm projectCode={projectCode} roles={roles} />

      {projectCode && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Username</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Since</th></tr>
            </thead>
            <tbody>
              {rows.map((r:any)=>(
                <tr key={r.user_id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{r.email}</td>
                  <td className="py-2 pr-4">{r.username||''}</td>
                  <td className="py-2 pr-4">{r.role}</td>
                  <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
