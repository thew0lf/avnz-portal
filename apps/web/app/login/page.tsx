import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { getCookieName } from '@/lib/auth'

export default async function LoginPage({ searchParams }: { searchParams?: { next?: string; client_code?: string } }) {
  // If already logged in, redirect away
  if (cookies().get(getCookieName())) {
    redirect(searchParams?.next || '/admin')
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use one of the demo users in .env</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/login" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_code">Client Code</Label>
              <Input id="client_code" name="client_code" placeholder="demo" required defaultValue={searchParams?.client_code || 'demo'} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required defaultValue="alice@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required defaultValue="password" />
            </div>
            <input type="hidden" name="next" value={searchParams?.next || ''} />
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">Admin-only pages will require org/admin role.</CardFooter>
      </Card>
    </main>
  )
}
