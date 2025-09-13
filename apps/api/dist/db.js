import { Pool } from "pg";
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL ? { rejectUnauthorized: false } : undefined,
});
export async function withRls(userId, orgId, fn) {
    const client = await pool.connect();
    try {
        return await fn(client);
    }
    finally {
        client.release();
    }
}
