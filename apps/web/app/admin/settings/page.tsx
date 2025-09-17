import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import SettingsForm from './settingsForm'

export default async function SettingsPage(){
  const cookie = cookies().get(getCookieName())
  const token = cookie?.value || ''
  const session = token ? verifyToken(token, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/login?next=/admin/settings')
  const [profRes, prefRes] = await Promise.all([
    apiFetch('/me/profile'),
    apiFetch('/me/preferences'),
  ])
  const profile = (await profRes.json().catch(()=>({}))).profile || null
  const preferences = (await prefRes.json().catch(()=>({}))).preferences || { theme:'system', color_scheme:'default' }
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">User Settings</h1>
      <SettingsForm profile={profile} preferences={preferences} />
    </main>
  )
}
