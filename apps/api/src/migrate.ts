import { pool } from "./db.js";
import fs from "fs"; import path from "path";

async function runMigrations(client: any) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id serial primary key, filename text unique not null, applied_at timestamptz not null default now())"
  );
  // Ensure base schema exists even if earlier runs recorded as applied but objects are missing.
  // The following files are written to be idempotent (CREATE IF NOT EXISTS, guarded DDL).
  const bootstrapFiles = [
    "001_schema.sql",
    "002_auth.sql",
    "003_auth_tokens.sql",
    "004_orgs.sql",
  ];
  const baseDir = process.env.MIGRATIONS_DIR || "/db/init";
  try {
    for (const bf of bootstrapFiles) {
      const p = path.join(baseDir, bf);
      if (!fs.existsSync(p)) continue;
      const sql = fs.readFileSync(p, "utf8");
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("commit");
        console.log("Ensured base migration", bf);
      } catch (err) {
        try { await client.query("rollback"); } catch {}
        throw err;
      }
    }
  } catch (e) {
    console.warn("Bootstrap base schema failed:", e);
    throw e;
  }
  const dir = process.env.MIGRATIONS_DIR || "/db/init";
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  const done = await client.query("select filename from schema_migrations");
  const doneSet = new Set(done.rows.map((r: any) => r.filename));
  for (const f of files) {
    if (doneSet.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    console.log("Applying migration", f);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations(filename) values ($1)", [f]);
      await client.query("commit");
    } catch (err) {
      try { await client.query("rollback"); } catch {}
      throw err;
    }
  }
  // Seed default permissions
  try {
    const perms: [string, string][] = [
      ['admin','Full administrative access'],
      ['manage_clients','Create and manage clients'],
      ['manage_projects','Create and manage projects'],
      ['manage_members','Add and update members'],
      ['manage_pricing','Create and update pricing rules'],
      ['view_usage','View usage summaries'],
      ['ingest','Ingest documents'],
      ['search','Perform semantic search']
    ];
    for (const [key, desc] of perms) {
      await client.query('insert into permissions(key,description) values ($1,$2) on conflict (key) do nothing', [key, desc]);
    }
    console.log('Seeded default permissions');
  } catch (e) {
    console.warn('Seeding permissions failed:', e);
  }
}

export async function migrate() {
  const maxAttempts = Number(process.env.MIGRATE_MAX_ATTEMPTS || 30);
  const delayMs = Number(process.env.MIGRATE_RETRY_DELAY_MS || 2000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let client: any;
    try {
      client = await pool.connect();
      await runMigrations(client);
      client.release();
      return; // success
    } catch (e: any) {
      if (client) { try { client.release(); } catch {} }
      const msg = e?.message || String(e);
      const final = attempt === maxAttempts;
      console.warn(`Migration attempt ${attempt}/${maxAttempts} failed: ${msg}`);
      if (final) {
        console.error('Migrations failed after maximum retries.');
        throw e;
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}

const isMain = (() => { try { return new URL(process.argv[1], 'file://').href === import.meta.url; } catch { return false; } })();
if (isMain) { migrate().then(()=>process.exit(0)).catch(()=>process.exit(1)); }
