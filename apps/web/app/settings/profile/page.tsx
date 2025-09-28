import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import ProfileForm from './profileForm'
import DeleteAccountSection from './DeleteAccountSection'

export default async function ProfileSettingsPage(){
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/settings/profile')
  const r = await apiFetch('/me/profile')
  const { profile } = (await r.json().catch(()=>({})))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your name and contact email.</p>
      </div>
      <ProfileForm email={session.email} profile={profile||null} />
      <DeleteAccountSection />
    </div>
  )
}
