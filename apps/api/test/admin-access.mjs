// Admin access smoke: ensure org creator (legacy role 'org' aliasing portal-manager) can hit guarded endpoints
const base = process.env.API_BASE || 'http://localhost:3001'

function expect(cond, msg){ if(!cond){ console.error('✗', msg); process.exitCode = 1 } else { console.log('✓', msg) } }
async function j(r){ try{ return await r.json() }catch{ return {} } }

(async () => {
  const orgCode = 'admin' + Date.now().toString(36)
  const email = `${orgCode}@example.com`
  const password = 'Str0ngPassw0rd!'
  const reg = await fetch(`${base}/orgs/register`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ org_code: orgCode, org_name: `Admin ${orgCode}`, email, password }) })
  expect(reg.ok, 'register org ok')
  const rb = await j(reg)
  const token = rb?.token
  const orgUUID = rb?.org?.id
  expect(!!token && !!orgUUID, 'got token and orgUUID')
  const h = { 'content-type':'application/json', authorization: `Bearer ${token}` }

  // Guarded endpoints
  const routes = [
    { method:'GET', path: `/admin/security-settings?nodeId=${encodeURIComponent(orgUUID)}` },
    { method:'POST', path: '/admin/templates/email', body: { nodeId: orgUUID, key:'invite', subject:`Hello ${orgCode}`, body:'x' } },
  ]
  for (const r of routes) {
    const res = await fetch(`${base}${r.path}`, { method: r.method, headers: h, body: r.body? JSON.stringify(r.body): undefined })
    const ok = res.ok
    if (!ok) {
      const t = await res.text(); console.error('Route failed', r.method, r.path, res.status, t)
    }
    expect(ok, `${r.method} ${r.path} allowed`)
  }
})();

