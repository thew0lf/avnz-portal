import Link from 'next/link'
import { apiFetch } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function SlackDashboard(){
  const [orgRes, eventsRes] = await Promise.all([
    apiFetch('/orgs/mine').then(r=>r.json()).catch(()=>({ rows: [] })),
    apiFetch('/slack/events?limit=100').then(r=>r.json()).catch(()=>({ rows: [] }))
  ])
  const org = (orgRes.rows||[])[0] || null
  const ngrokBase = process.env.NEXT_PUBLIC_NGROK_PUBLIC_URL || process.env.NGROK_PUBLIC_URL || ''
  const webhookPath = org? `/slack/events/${org.code}` : '/slack/events/:orgCode'
  const fullUrl = ngrokBase ? `${ngrokBase}${webhookPath}` : null
  const rows = eventsRes.rows||[]
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Slack</h1>
        <p className="text-sm text-gray-600">View inbound Slack events. Configure your Slack app to send Events API requests to the ngrok URL below.</p>
      </div>

      <div className="border rounded p-4 grid gap-2 bg-white">
        <h2 className="font-medium">Local Development via ngrok</h2>
        <ol className="list-decimal ml-5 text-sm text-gray-700 grid gap-1">
          <li>Set the Slack signing secret under Admin → Service Secrets with service <code>slack</code> and name <code>signing_secret</code>.</li>
          <li>Start ngrok pointing to API: <code>docker compose up -d ngrok</code> (set <code>NGROK_AUTHTOKEN</code> in <code>.env</code> first).</li>
          <li>Copy the public URL from the ngrok logs or API and set your Slack app Events Request URL to the endpoint path shown here.</li>
        </ol>
        <div className="text-sm">
          <div>Endpoint path: <code>{webhookPath}</code></div>
          {fullUrl ? (
            <div>Full Request URL: <code className="break-all">{fullUrl}</code></div>
          ) : (
            <div className="text-amber-700">Set <code>NGROK_PUBLIC_URL</code> in <code>.env</code> to see the full Request URL.</div>
          )}
        </div>
      </div>

      <div className="border rounded bg-white">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <h2 className="font-medium">Recent Events</h2>
          <span className="text-xs text-gray-500">{rows.length} shown</span>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Channel</th>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Text</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r:any)=> (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.event_type||'-'}</td>
                  <td className="px-3 py-2">{r.channel_id||'-'}</td>
                  <td className="px-3 py-2">{r.user_id||'-'}</td>
                  <td className="px-3 py-2 max-w-[420px] truncate" title={r.text||''}>{r.text||''}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No events yet. Send a message or enable a test event in your Slack app.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

