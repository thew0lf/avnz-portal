import { redirect } from 'next/navigation'

// Legacy Admin Settings page → redirect to new unified Settings shell with left menu
export default function AdminSettingsRedirect(){
  redirect('/settings/profile')
}
