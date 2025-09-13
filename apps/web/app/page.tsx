import Link from 'next/link'

export default function Home(){
  return (
    <main className="container py-16 space-y-8">
      <h1 className="text-2xl font-semibold">Welcome to Avnz Portal</h1>
      <p className="text-muted-foreground">Multi-tenant RBAC portal with org/client short-code login, invites, MFA, and SOC2/ISO-aligned controls.</p>
      <div className="flex gap-3">
        <Link className="underline" href="/login">Sign in</Link>
        <Link className="underline" href="/register/org">Register Org</Link>
        <Link className="underline" href="/accept">Accept Invite</Link>
        <Link className="underline" href="/reset">Reset Password</Link>
      </div>
    </main>
  )
}

