import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCookieName, verifyToken } from '@/lib/auth'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function OrgRegister(){
  const cookie = cookies().get(getCookieName())
  if (cookie?.value) redirect('/register/client')
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/register/org" method="post" className="space-y-3">
            <div className="space-y-1"><Label htmlFor="org_code">Org Code</Label><Input id="org_code" name="org_code" placeholder="short-code" required /></div>
            <div className="space-y-1"><Label htmlFor="org_name">Org Name</Label><Input id="org_name" name="org_name" placeholder="Company, Inc." required /></div>
            <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" placeholder="admin@example.com" required /></div>
            <div className="space-y-1"><Label htmlFor="username">Username</Label><Input id="username" name="username" placeholder="admin" /></div>
            <div className="space-y-1"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required /></div>
            <Button type="submit" className="w-full">Create & Continue</Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">First org user becomes org manager.</CardFooter>
      </Card>
    </main>
  )
}

