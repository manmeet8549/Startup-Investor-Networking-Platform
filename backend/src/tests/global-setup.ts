import { config } from '../config.js';
import { checkDatabaseConnection } from '../db/pool.js';

export async function setup() {
  // Extract Postgres host without credentials
  let pgHost = 'unknown';
  try {
    if (config.DATABASE_URL) {
      const parsed = new URL(config.DATABASE_URL);
      pgHost = parsed.host;
    }
  } catch {
    // If URL parsing fails, extract host from connection string
    const match = config.DATABASE_URL?.match(/@([^/:?]+)/);
    if (match) {
      pgHost = match[1];
    }
  }

  console.log('================================================================');
  console.log(`[Vitest Global Setup] config.dbMode: ${config.dbMode}`);
  console.log(`[Vitest Global Setup] PostgreSQL Host: ${pgHost}`);
  console.log('================================================================');

  if (config.dbMode !== 'postgres') {
    throw new Error(
      `Vitest integration suites must run against real Postgres. Current dbMode: '${config.dbMode}'. Ensure DATABASE_URL is set and USE_IN_MEMORY_DB is false.`
    );
  }

  // Guard against running test suite on unauthorized / production databases
  const defaultAllowlist = 'tdvvdkobcgfrvotzdcor,pooler.supabase.com,localhost,127.0.0.1';
  const allowlist = (process.env.TEST_DATABASE_ALLOWLIST || defaultAllowlist)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const isAllowed = allowlist.some((allowed) => pgHost.toLowerCase().includes(allowed));
  if (!isAllowed) {
    throw new Error(
      `[SECURITY GUARD] Vitest refused to run against database host '${pgHost}'. Host is not present in TEST_DATABASE_ALLOWLIST: [${allowlist.join(', ')}].`
    );
  }

  const conn = await checkDatabaseConnection();
  if (!conn.ok) {
    throw new Error(`Failed to connect to PostgreSQL in Vitest global setup: ${conn.error}`);
  }

  console.log(`[Vitest Global Setup] Successfully validated allowed Postgres connection.\n`);
}
