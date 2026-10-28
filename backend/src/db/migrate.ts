import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<{ applied: string[]; total: number }> {
  const dbUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.trim() === '') {
    throw new Error('DATABASE_URL or MIGRATION_DATABASE_URL is required to run migrations.');
  }

  // Sanitize sslmode in connection string to ensure rejectUnauthorized is set properly
  const sanitized = dbUrl.replace(/([?&])sslmode=[^&]*(&?)/g, (_match, p1, p2) => (p1 === '?' && p2 ? '?' : ''));
  const isLocal = sanitized.includes('localhost') || sanitized.includes('127.0.0.1');

  const pool = new pg.Pool({
    connectionString: sanitized,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  const applied: string[] = [];

  try {
    console.log('[Migration] Connected to database.');

    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Fetch already applied versions
    const appliedRes = await client.query<{ version: string }>(
      `SELECT version FROM public.schema_migrations ORDER BY version ASC`
    );
    const appliedSet = new Set(appliedRes.rows.map((r) => r.version));

    // 3. Read migration files from supabase/migrations
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`[Migration] Found ${files.length} total migration files in repository.`);

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migration] Skipping already applied: ${file}`);
        continue;
      }

      console.log(`[Migration] Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // Execute within transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO public.schema_migrations (version, applied_at) VALUES ($1, now())`,
          [file]
        );
        await client.query('COMMIT');
        applied.push(file);
        console.log(`[Migration] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migration] Failed on ${file}:`, err instanceof Error ? err.message : String(err));
        throw err;
      }
    }

    if (applied.length === 0) {
      console.log('[Migration] All migrations are already up to date.');
    } else {
      console.log(`[Migration] Successfully applied ${applied.length} new migration(s).`);
    }

    return { applied, total: files.length };
  } finally {
    client.release();
    await pool.end();
  }
}

// Direct execution CLI entrypoint
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  runMigrations()
    .then((result) => {
      console.log('[Migration] Process finished cleanly:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Migration process aborted with error:', err.message || err);
      process.exit(1);
    });
}
