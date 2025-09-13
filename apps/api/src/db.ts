import { Pool } from "pg";
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL ? { rejectUnauthorized: false } : undefined,
});
export async function withRls(userId: string | null, orgId: string | null, fn: (client: any) => Promise<any>) {
  const client = await pool.connect();
  try { return await fn(client); } finally { client.release(); }
}
export async function getClientForReq(req: { auth?: any }) {
  const client: any = await pool.connect();
  const orgUUID = req?.auth?.orgUUID || null;
  try {
    if (orgUUID) {
      await client.query("select set_config('app.org_uuid', $1, true)", [String(orgUUID)]);
    }
  } catch {}
  const orig = client.release.bind(client);
  client.release = async () => {
    try { await client.query("select set_config('app.org_uuid', '', false)"); } catch {}
    return orig();
  };
  return client;
}
