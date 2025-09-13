import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ClientRegister(){
  const cookie = cookies().get(getCookieName())
  const session = cookie?.value ? verifyToken(cookie.value, process.env.AUTH_SECRET || 'dev-secret-change-me') : null
  if (!session) redirect('/register/org')
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Client</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/register/client" method="post" className="space-y-3">
            <div className="space-y-1"><Label htmlFor="name">Client Name</Label><Input id="name" name="name" placeholder="Customer Co." required /></div>
            <Button type="submit" className="w-full">Create Client</Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">Creator becomes client manager.</CardFooter>
      </Card>
    </main>
  )
}
