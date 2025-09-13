import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { cookies } from 'next/headers'
import LoginForm from './LoginForm'
import { getCookieName } from '@/lib/auth'

export default async function LoginPage({ searchParams }: { searchParams?: { next?: string; client_code?: string } }) {
  if (cookies().get(getCookieName())) { redirect(searchParams?.next || '/admin') }
  const csrf = cookies().get('csrf')?.value || ''
  const defaultValues = { client_code: searchParams?.client_code || '', email: '', password: '' }
  // Render form (client component wrapper)
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm defaultValues={defaultValues} nextPath={searchParams?.next || ''} csrf={csrf} />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">Enter your client short code, email or username, and password.</CardFooter>
      </Card>
    </main>
  )
}
