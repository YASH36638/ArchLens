/**
 * Apply Prisma migrations to Neon over WebSockets (port 443), bypassing TCP 5432.
 *
 * Usage (from repo Archlens/):
 *   npx pnpm@10.33.0 --filter @archlens/api migrate:neon
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const insecure = process.env.ARCHLENS_TLS_INSECURE !== '0';
if (insecure) {
  neonConfig.webSocketConstructor = class NeonWs extends ws {
    constructor(url, protocols) {
      super(url, protocols, { rejectUnauthorized: false });
    }
  };
} else {
  neonConfig.webSocketConstructor = ws;
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required in apps/api/.env');
  }

  const pool = new Pool({ connectionString });
  console.log('Connecting to Neon via WebSocket…');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  const applied = await pool.query(
    'SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL'
  );
  const appliedNames = new Set(applied.rows.map((r) => r.migration_name));

  const dirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of dirs) {
    if (appliedNames.has(name)) {
      console.log(`skip (already applied): ${name}`);
      continue;
    }

    const sqlPath = path.join(MIGRATIONS_DIR, name, 'migration.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn(`skip (no migration.sql): ${name}`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    console.log(`applying: ${name}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
          (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
        [randomUUID(), checksum, name]
      );
      await client.query('COMMIT');
      console.log(`ok: ${name}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`FAILED: ${name}`);
      throw e;
    } finally {
      client.release();
    }
  }

  const check = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`
  );
  console.log('tables:', check.rows.map((r) => r.tablename).join(', '));

  await pool.end();
  console.log('migrate:neon complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
