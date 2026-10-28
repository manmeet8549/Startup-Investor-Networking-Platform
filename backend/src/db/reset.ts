// Founders Den MVP - Database Reset & Seed Script
// Runs all migrations, applies schema & RLS, and seeds initial data

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabaseConnection, pool, closePool } from './pool.js';
import { inMemoryDb } from './index.js';
import { config } from '../config.js';
import { runSeed } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function resetAndSeedDatabase(): Promise<{
  mode: 'postgres' | 'in-memory';
  summary: {
    profiles: number;
    startups: number;
    investorProfiles: number;
    mentorProfiles: number;
    incubatorProfiles: number;
    programs: number;
    applications: number;
  };
}> {
  console.log('--- [Founders Den] Database Reset & Seed Process Started ---');
  console.log(`Active DB mode: ${config.dbMode}`);

  const hasDropFlag = process.argv.includes('--i-know-this-drops-tables');
  if (config.NODE_ENV === 'production' && !hasDropFlag) {
    throw new Error(
      'BLOCKED: db:reset is prohibited in production without the explicit --i-know-this-drops-tables flag.'
    );
  }

  // Always reset and seed in-memory store
  inMemoryDb.reset();

  if (config.USE_IN_MEMORY_DB || !config.DATABASE_URL) {
    console.log('[In-Memory] Explicit in-memory mode active. Initialized full in-memory data model.');
    return {
      mode: 'in-memory',
      summary: {
        profiles: inMemoryDb.profiles.size,
        startups: inMemoryDb.startups.size,
        investorProfiles: inMemoryDb.investorProfiles.size,
        mentorProfiles: inMemoryDb.mentorProfiles.size,
        incubatorProfiles: inMemoryDb.incubatorProfiles.size,
        programs: inMemoryDb.incubatorPrograms.size,
        applications: inMemoryDb.applications.size,
      },
    };
  }

  const health = await checkDatabaseConnection();
  if (!health.ok) {
    throw new Error(`Failed to connect to PostgreSQL at ${config.DATABASE_URL}: ${health.error}`);
  }

  console.log('[PostgreSQL] Connected to Supabase DB. Applying migrations in order...');

  const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`[PostgreSQL] Executing migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      try {
        await pool.query(sql);
        console.log(`[PostgreSQL] Successfully applied: ${file}`);
      } catch (migErr: any) {
        console.error(`[PostgreSQL] Migration error in ${file}:`, migErr.message);
        throw new Error(`Migration ${file} failed: ${migErr.message}`);
      }
    }
  }

  // Seed data via runSeed()
  await runSeed();

  return {
    mode: 'postgres',
    summary: {
      profiles: inMemoryDb.profiles.size,
      startups: inMemoryDb.startups.size,
      investorProfiles: inMemoryDb.investorProfiles.size,
      mentorProfiles: inMemoryDb.mentorProfiles.size,
      incubatorProfiles: inMemoryDb.incubatorProfiles.size,
      programs: inMemoryDb.incubatorPrograms.size,
      applications: inMemoryDb.applications.size,
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith('reset.ts')) {
  resetAndSeedDatabase()
    .then((res) => {
      console.log('Database reset & seed complete:', res);
      return closePool();
    })
    .catch((err) => {
      console.error('Reset failed:', err);
      process.exit(1);
    });
}
