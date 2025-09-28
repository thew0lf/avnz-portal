// Minimal templates E2E smoke: create, list, preview, delete
const base = process.env.API_BASE || 'http://localhost:3001'

function expect(cond, msg){ if(!cond){ console.error('✗', msg); process.exitCode = 1 } else { console.log('✓', msg) } }
async function j(r){ try{ return await r.json() }catch{ return {} } }

(async () => {
  // 1) Register org and get orgUUID + token
  const orgCode = 'tmpl' + Date.now().toString(36)
  const email = `${orgCode}@example.com`
  const password = 'Str0ngPassw0rd!'
  const reg = await fetch(`${base}/orgs/register`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ org_code: orgCode, org_name: `Tmp ${orgCode}`, email, password }) })
  expect(reg.ok, 'register org ok')
  const rb = await j(reg)
  const token = rb?.token
  const orgUUID = rb?.org?.id
  expect(!!token && !!orgUUID, 'got token and orgUUID')

  const h = { 'content-type':'application/json', authorization: `Bearer ${token}` }

  // 2) Upsert email template override (invite)
  const up = await fetch(`${base}/admin/templates/email`, { method:'POST', headers: h, body: JSON.stringify({ nodeId: orgUUID, key:'invite', client_id: null, subject:`Test ${orgCode}`, body:'Text {{url}}' }) })
  const upb = await j(up); console.log('upsert status', up.status, JSON.stringify(upb))
  expect(up.ok, 'upsert email ok')
  const tid = upb?.id
  expect(!!tid, 'template id returned')

  // 3) List should include it
  const list = await fetch(`${base}/admin/templates/email?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lb = await j(list)
  const found = (lb?.rows||[]).some((r)=> String(r.id) === String(tid))
  expect(found, 'template appears in list')

  // 4) Preview should succeed
  const prev = await fetch(`${base}/admin/templates/email/preview`, { method:'POST', headers: h, body: JSON.stringify({ nodeId: orgUUID, to: email, subject: `Test ${orgCode}`, body: 'Hello', body_html: '<b>Hello</b>' }) })
  const prevb = await j(prev); console.log('preview status', prev.status, JSON.stringify(prevb))
  expect(prev.ok, 'preview ok')

  // 5) Delete
  const del = await fetch(`${base}/admin/templates/email/${encodeURIComponent(tid)}`, { method:'DELETE', headers: h, body: JSON.stringify({ nodeId: orgUUID }) })
  const delb = await j(del); console.log('delete status', del.status, JSON.stringify(delb))
  expect(del.ok, 'delete ok')
})();
