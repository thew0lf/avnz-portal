import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cookies } from 'next/headers'
import RegisterOrgForm from './RegisterOrgForm'

export default function RegisterOrg(){
  const csrf = cookies().get('csrf')?.value || ''
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterOrgForm csrf={csrf} />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">Client code is generated on client creation.</CardFooter>
      </Card>
    </main>
  )
}
