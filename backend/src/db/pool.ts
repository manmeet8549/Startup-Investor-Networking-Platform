import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Ensure sslmode parameter in connection string doesn't override our explicit SSL configuration
const sanitizedConnectionString = config.DATABASE_URL.replace(/([?&])sslmode=[^&]*(&?)/g, (_match, p1, p2) => (p1 === '?' && p2 ? '?' : ''));

export const pool = new Pool({
  connectionString: sanitizedConnectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client in pool');
});

export interface DbHealthResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export async function checkDatabaseConnection(): Promise<DbHealthResult> {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT 1 AS health_check');
    const latencyMs = Date.now() - start;
    if (res.rows.length > 0 && res.rows[0].health_check === 1) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: 'Unexpected response from database' };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, latencyMs }, 'Database health check query failed');
    return { ok: false, latencyMs, error: errorMessage };
  }
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rows: res.rowCount }, 'Executed SQL query');
    return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
  } catch (err: any) {
    if (err.code === 'ECONNRESET' || err.code === '57P01' || err.code === 'ETIMEDOUT') {
      logger.warn({ code: err.code }, 'Transient connection reset; retrying query once...');
      const res = await pool.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
    }
    throw err;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
