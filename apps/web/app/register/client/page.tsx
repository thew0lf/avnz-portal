import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import ClientRegisterForm from './ClientRegisterForm'

export default function ClientRegister(){
  const cookie = cookies().get(getCookieName())
  const session = cookie?.value ? verifyToken(cookie.value, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/register/org')
  const csrf = cookies().get('csrf')?.value || ''
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientRegisterForm csrf={csrf} />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">Creator becomes client manager.</CardFooter>
      </Card>
    </main>
  )
}
