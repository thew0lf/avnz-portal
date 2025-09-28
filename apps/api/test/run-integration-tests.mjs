// Basic integration tests for auth + password change using the running API
// Requires api service up on http://localhost:3001

const base = process.env.API_BASE || 'http://localhost:3001'

function expect(cond, msg){ if(!cond){ console.error('\u274c', msg); process.exitCode = 1 } else { console.log('\u2705', msg) } }

function json(res){ return res.json() }

(async () => {
  const orgCode = 'test' + Date.now().toString(36)
  const email = `${orgCode}@example.com`
  const password = 'Str0ngPassw0rd!'

  // Register org + user
  const reg = await fetch(`${base}/orgs/register`, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ org_code: orgCode, org_name: `Test ${orgCode}`, email, password })
  })
  expect(reg.ok, 'orgs/register should succeed')
  const regBody = await json(reg).catch(()=>null)
  const token = regBody?.token
  const refresh = regBody?.refresh_token
  expect(!!token, 'register returns token')
  expect(!!refresh, 'register returns refresh_token')

  // Profile upsert + fetch
  {
    const up = await fetch(`${base}/me/profile`, { method:'POST', headers:{'content-type':'application/json', authorization: `Bearer ${token}`}, body: JSON.stringify({ first_name: 'Ada', last_name: 'Lovelace' }) })
    expect(up.ok, 'profile upsert ok')
    const get = await fetch(`${base}/me/profile`, { headers:{ authorization: `Bearer ${token}` } })
    const body = await get.json().catch(()=>({}))
    expect(body?.profile?.first_name === 'Ada' && body?.profile?.last_name === 'Lovelace', 'profile fetch reflects changes')
  }

  // Preferences upsert + fetch
  {
    const up = await fetch(`${base}/me/preferences`, { method:'POST', headers:{'content-type':'application/json', authorization: `Bearer ${token}`}, body: JSON.stringify({ theme: 'light', color_scheme: 'blue' }) })
    expect(up.ok, 'preferences upsert ok')
    const get = await fetch(`${base}/me/preferences`, { headers:{ authorization: `Bearer ${token}` } })
    const body = await get.json().catch(()=>({}))
    expect(body?.preferences?.theme === 'light' && body?.preferences?.color_scheme === 'blue', 'preferences fetch reflects changes')
  }

  // Refresh is valid before password change
  const ref1 = await fetch(`${base}/auth/refresh`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ refresh_token: refresh }) })
  expect(ref1.ok, 'refresh before password change should succeed')

  // Wrong current password
  const wrong = await fetch(`${base}/me/change-password`, { method:'POST', headers:{'content-type':'application/json', authorization: `Bearer ${token}`}, body: JSON.stringify({ current_password: 'nope', new_password: 'An0therStrong!' }) })
  const wrongText = await wrong.text()
  expect(wrong.status === 400, `reject wrong current password (status=${wrong.status}, body=${wrongText})`)

  // Weak new password
  const weak = await fetch(`${base}/me/change-password`, { method:'POST', headers:{'content-type':'application/json', authorization: `Bearer ${token}`}, body: JSON.stringify({ current_password: password, new_password: 'short' }) })
  const weakText = await weak.text()
  expect(weak.status === 400, `reject weak new password (status=${weak.status}, body=${weakText})`)

  // Successful change
  const good = await fetch(`${base}/me/change-password`, { method:'POST', headers:{'content-type':'application/json', authorization: `Bearer ${token}`}, body: JSON.stringify({ current_password: password, new_password: 'An0therStrong!' }) })
  const goodText = await good.text()
  expect(good.ok, `accept valid password change (status=${good.status}, body=${goodText})`)

  // Refresh is revoked after change
  const ref2 = await fetch(`${base}/auth/refresh`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ refresh_token: refresh }) })
  const ref2Text = await ref2.text()
  expect(ref2.status >= 400, `refresh after password change should be revoked (status=${ref2.status}, body=${ref2Text})`)
})();
