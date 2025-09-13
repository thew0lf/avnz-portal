import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'

export default function AdminHome() {
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin')
  const hasAdmin = session.roles.includes('org') || session.roles.includes('admin')
  if (!hasAdmin) redirect('/unauthorized')

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Admin dashboard</h1>
      <p>
        Use the sidebar to manage pricing rules and test pricing; check usage and compliance exports.
      </p>
    </div>
  )
}
