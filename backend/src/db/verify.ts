import pg from 'pg';
import { config } from '../config.js';

export async function verifyDatabase(): Promise<void> {
  console.log('====================================================');
  console.log(`[DB Verify] Active DB Mode: ${config.dbMode}`);
  console.log(`[DB Verify] DATABASE_URL: ${config.DATABASE_URL ? '[CONFIGURED]' : '(none)'}`);
  console.log('====================================================');

  if (config.USE_IN_MEMORY_DB || !config.DATABASE_URL) {
    console.log('[DB Verify] Running in IN-MEMORY mode.');
    console.log('[DB Verify] Skipping Postgres table verification.');
    return;
  }

  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.DATABASE_URL.includes('supabase.co') || config.DATABASE_URL.includes('pooler.supabase.com')
      ? { rejectUnauthorized: false }
      : false,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    try {
      console.log('\n--- PUBLIC SCHEMA TABLES & RLS STATUS ---');
      const tablesRes = await client.query<{
        table_name: string;
        rls_enabled: boolean;
      }>(`
        SELECT 
          c.relname AS table_name,
          c.relrowsecurity AS rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname;
      `);

      if (tablesRes.rows.length === 0) {
        console.log('[DB Verify] No tables found in public schema!');
      } else {
        console.log(
          `${'Table Name'.padEnd(32)} | ${'Rows'.padStart(8)} | ${'RLS Enabled'.padEnd(12)}`
        );
        console.log('-'.repeat(58));

        let tablesWithRls = 0;
        let tablesWithoutRls = 0;

        for (const row of tablesRes.rows) {
          let count = '0';
          try {
            const countRes = await client.query(`SELECT COUNT(*) AS count FROM public."${row.table_name}"`);
            count = countRes.rows[0]?.count || '0';
          } catch (cntErr) {
            count = 'err';
          }

          const rlsStatus = row.rls_enabled ? 'ENABLED' : 'DISABLED';
          if (row.rls_enabled) tablesWithRls++;
          else tablesWithoutRls++;

          console.log(
            `${row.table_name.padEnd(32)} | ${count.padStart(8)} | ${rlsStatus.padEnd(12)}`
          );
        }

        console.log('-'.repeat(58));
        console.log(`Total Public Tables: ${tablesRes.rows.length}`);
        console.log(`Tables with RLS:    ${tablesWithRls}`);
        console.log(`Tables without RLS: ${tablesWithoutRls}`);
      }

      console.log('\n--- STORAGE BUCKETS ---');
      try {
        const bucketRes = await client.query<{
          id: string;
          name: string;
          public: boolean;
          file_size_limit: number | null;
        }>(`
          SELECT id, name, public, file_size_limit 
          FROM storage.buckets 
          ORDER BY name;
        `);

        if (bucketRes.rows.length === 0) {
          console.log('[DB Verify] No storage buckets found.');
        } else {
          console.log(
            `${'Bucket ID'.padEnd(25)} | ${'Public'.padEnd(8)} | ${'Size Limit'.padEnd(12)}`
          );
          console.log('-'.repeat(50));
          for (const b of bucketRes.rows) {
            const limit = b.file_size_limit ? `${Math.round(b.file_size_limit / 1024 / 1024)}MB` : 'Unlimited';
            console.log(
              `${b.id.padEnd(25)} | ${String(b.public).padEnd(8)} | ${limit.padEnd(12)}`
            );
          }
        }
      } catch (err: any) {
        console.log('[DB Verify] Storage schema query notice:', err.message);
      }

      console.log('====================================================\n');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[DB Verify] Error connecting to PostgreSQL:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify.ts')) {
  verifyDatabase().catch((err) => {
    console.error('[DB Verify] Fatal:', err);
    process.exit(1);
  });
}
