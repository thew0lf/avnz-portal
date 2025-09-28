// Soft-delete E2E: create resources via admin endpoints, delete (soft), and verify excluded from lists
const base = process.env.API_BASE || 'http://localhost:3001'

function expect(cond, msg){ if(!cond){ console.error('✗', msg); process.exitCode = 1 } else { console.log('✓', msg) } }
async function j(r){ try{ return await r.json() }catch{ return {} } }

(async () => {
  const suffix = Date.now().toString(36)
  const orgCode = 'sd' + suffix
  const email = `${orgCode}@example.com`
  const password = 'Str0ngPassw0rd!'
  const reg = await fetch(`${base}/orgs/register`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ org_code: orgCode, org_name: `SD ${orgCode}`, email, password }) })
  expect(reg.ok, 'register org ok')
  const rb = await j(reg)
  const token = rb?.token
  const orgUUID = rb?.org?.id
  expect(!!token && !!orgUUID, 'got token and orgUUID')
  const h = { 'content-type':'application/json', authorization: `Bearer ${token}` }

  // 1) Actions
  const actionName = `test.action.${suffix}`
  const ca = await fetch(`${base}/admin/actions`, { method:'POST', headers:h, body: JSON.stringify({ nodeId: orgUUID, name: actionName }) })
  expect(ca.ok, 'create action ok')
  const la1 = await fetch(`${base}/admin/actions?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const la1b = await j(la1)
  expect((la1b.rows||[]).some(r=>r.name===actionName), 'action appears in list')
  const da = await fetch(`${base}/admin/actions/${encodeURIComponent(actionName)}?nodeId=${encodeURIComponent(orgUUID)}`, { method:'DELETE', headers: { authorization: `Bearer ${token}` } })
  expect(da.ok, 'delete action ok')
  const la2 = await fetch(`${base}/admin/actions?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const la2b = await j(la2)
  expect(!(la2b.rows||[]).some(r=>r.name===actionName), 'action excluded after delete')

  // 2) Roles
  const roleName = `TempRole_${suffix}`
  const cr = await fetch(`${base}/admin/roles`, { method:'POST', headers:h, body: JSON.stringify({ nodeId: orgUUID, name: roleName, level: 10 }) })
  expect(cr.ok, 'create role ok')
  const crb = await j(cr); const roleId = crb?.id
  expect(!!roleId, 'role id returned')
  const lr1 = await fetch(`${base}/admin/roles?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lr1b = await j(lr1)
  expect((lr1b.rows||[]).some(r=>String(r.id)===String(roleId)), 'role appears in list')
  const dr = await fetch(`${base}/admin/roles/${encodeURIComponent(roleId)}?nodeId=${encodeURIComponent(orgUUID)}`, { method:'DELETE', headers: { authorization: `Bearer ${token}` } })
  expect(dr.ok, 'delete role ok')
  const lr2 = await fetch(`${base}/admin/roles?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lr2b = await j(lr2)
  expect(!(lr2b.rows||[]).some(r=>String(r.id)===String(roleId)), 'role excluded after delete')

  // 3) Permissions (requires a role id)
  // Create a minimal role again for min_role_id
  const cr2 = await fetch(`${base}/admin/roles`, { method:'POST', headers:h, body: JSON.stringify({ nodeId: orgUUID, name: roleName+"B", level: 5 }) })
  const cr2b = await j(cr2); const minRoleId = cr2b?.id
  expect(!!minRoleId, 'min role id ready')
  const permDom = 'node', permRes = 'org', permAct = `perm.action.${suffix}`
  // ensure referenced action exists (FK)
  const ca2 = await fetch(`${base}/admin/actions`, { method:'POST', headers:h, body: JSON.stringify({ nodeId: orgUUID, name: permAct }) })
  expect(ca2.ok, 'create action for permission ok')
  const cp = await fetch(`${base}/admin/permissions`, { method:'POST', headers:h, body: JSON.stringify({ nodeId: orgUUID, domain: permDom, resource_type: permRes, action_name: permAct, min_role_id: minRoleId }) })
  if (!cp.ok) {
    const txt = await cp.text(); console.error('create perm failed', cp.status, txt)
  }
  expect(cp.ok, 'create permission ok')
  const lpb1 = await fetch(`${base}/admin/permissions?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lpb1b = await j(lpb1)
  const pRow = (lpb1b.rows||[]).find(r=>r.domain===permDom && r.resource_type===permRes && r.action_name===permAct)
  expect(!!pRow, 'permission appears in list')
  const dp = await fetch(`${base}/admin/permissions/${encodeURIComponent(pRow.id)}?nodeId=${encodeURIComponent(orgUUID)}`, { method:'DELETE', headers: { authorization: `Bearer ${token}` } })
  if (!dp.ok) {
    const txt = await dp.text(); console.error('delete perm failed', dp.status, txt)
  }
  expect(dp.ok, 'delete permission ok')
  const lpb2 = await fetch(`${base}/admin/permissions?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lpb2b = await j(lpb2)
  expect(!(lpb2b.rows||[]).some(r=>r.id===pRow.id), 'permission excluded after delete')
  // clean up action created for permission
  const da2 = await fetch(`${base}/admin/actions/${encodeURIComponent(permAct)}?nodeId=${encodeURIComponent(orgUUID)}`, { method:'DELETE', headers: { authorization: `Bearer ${token}` } })
  expect(da2.ok, 'delete action for permission ok')

  // 4) ABAC fence
  const abAction = `abac.action.${suffix}`
  const cabAct = await fetch(`${base}/admin/actions`, { method:'POST', headers:h, body: JSON.stringify({ nodeId: orgUUID, name: abAction }) })
  expect(cabAct.ok, 'create action for abac ok')
  const cab = await fetch(`${base}/admin/abac`, { method:'POST', headers:h, body: JSON.stringify({ nodeId: orgUUID, action_name: abAction, expr: { where: { org_id: '{{orgId}}' } } }) })
  expect(cab.ok, 'create abac ok')
  const cabb = await j(cab); const abId = cabb?.id
  const lab1 = await fetch(`${base}/admin/abac?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lab1b = await j(lab1)
  expect((lab1b.rows||[]).some(r=>String(r.id)===String(abId)), 'abac appears in list')
  const dab = await fetch(`${base}/admin/abac/${encodeURIComponent(abId)}?nodeId=${encodeURIComponent(orgUUID)}`, { method:'DELETE', headers: { authorization: `Bearer ${token}` } })
  expect(dab.ok, 'delete abac ok')
  const lab2 = await fetch(`${base}/admin/abac?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lab2b = await j(lab2)
  expect(!(lab2b.rows||[]).some(r=>String(r.id)===String(abId)), 'abac excluded after delete')
  const dabAct = await fetch(`${base}/admin/actions/${encodeURIComponent(abAction)}?nodeId=${encodeURIComponent(orgUUID)}`, { method:'DELETE', headers: { authorization: `Bearer ${token}` } })
  expect(dabAct.ok, 'delete action for abac ok')

  // 5) Route registry
  const routeBody = { nodeId: orgUUID, id: null, method:'GET', path:`/test/${suffix}`, domain:'node', resource_type:'org', action_name:'configure', resource_param:'nodeId' }
  const crt = await fetch(`${base}/admin/routes`, { method:'POST', headers:h, body: JSON.stringify(routeBody) })
  expect(crt.ok, 'create route ok')
  const crtb = await j(crt); const routeId = crtb?.id
  const lrt1 = await fetch(`${base}/admin/routes?nodeId=${encodeURIComponent(orgUUID)}&q=${encodeURIComponent(routeBody.path)}`, { headers: { authorization: `Bearer ${token}` } })
  const lrt1b = await j(lrt1)
  expect((lrt1b.rows||[]).some(r=>String(r.id)===String(routeId)), 'route appears in list')
  const drt = await fetch(`${base}/admin/routes/${encodeURIComponent(routeId)}?nodeId=${encodeURIComponent(orgUUID)}`, { method:'DELETE', headers: { authorization: `Bearer ${token}` } })
  expect(drt.ok, 'delete route ok')
  const lrt2 = await fetch(`${base}/admin/routes?nodeId=${encodeURIComponent(orgUUID)}`, { headers: { authorization: `Bearer ${token}` } })
  const lrt2b = await j(lrt2)
  expect(!(lrt2b.rows||[]).some(r=>String(r.id)===String(routeId)), 'route excluded after delete')
})();
