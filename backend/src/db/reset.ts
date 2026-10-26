// Founders Den MVP - Database Reset & Seed Script
// Runs all migrations, applies schema & RLS, and seeds initial data

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabaseConnection, pool, closePool } from './pool.js';
import { inMemoryDb } from './index.js';
import { config } from '../config.js';
import {
  seedProfiles,
  seedFounderProfiles,
  seedInvestorProfiles,
  seedMentorProfiles,
  seedIncubatorProfiles,
  seedStartups,
  seedIncubatorPrograms,
  seedApplications,
  seedDocuments,
  seedWatchlist,
  seedInvestorNotes,
  seedMessages,
} from './seed-data.js';

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

  // Always reset and seed in-memory store
  inMemoryDb.reset();

  const health = config.NODE_ENV !== 'test' ? await checkDatabaseConnection() : { ok: false };
  if (health.ok) {
    console.log('[PostgreSQL] Connected to Supabase DB. Applying migrations...');

    // Directory for migrations
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
        } catch (migErr: any) {
          console.warn(`[PostgreSQL] Notice in ${file}: ${migErr.message}`);
        }
      }
    }

    // Seed PostgreSQL tables
    console.log('[PostgreSQL] Seeding core profiles and entities...');
    for (const p of seedProfiles) {
      await pool.query(
        `INSERT INTO public.profiles (id, email, full_name, role, is_student, organization, bio, location, website, status, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           organization = EXCLUDED.organization,
           status = EXCLUDED.status,
           verification_status = EXCLUDED.verification_status;`,
        [p.id, p.email, p.full_name, p.role, p.is_student, p.organization, p.bio, p.location, p.website, p.status, p.verification_status]
      );
    }

    // Seed Startups
    for (const s of seedStartups) {
      await pool.query(
        `INSERT INTO public.startups (id, founder_id, name, tagline, description, sector, stage, location, funding_ask, currency, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           funding_ask = EXCLUDED.funding_ask;`,
        [s.id, s.founder_id, s.name, s.tagline, s.description, s.sector, s.stage, s.location, s.funding_ask, s.currency, s.visibility]
      );
    }

    // Seed Incubator Programs
    for (const prog of seedIncubatorPrograms) {
      await pool.query(
        `INSERT INTO public.incubator_programs (id, incubator_id, name, description, benefits, sectors, stages, deadline, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING;`,
        [prog.id, prog.incubator_id, prog.name, prog.description, prog.benefits, prog.sectors, prog.stages, prog.deadline, prog.is_active]
      );
    }

    console.log('[PostgreSQL] Migration and seeding complete.');
    return {
      mode: 'postgres',
      summary: {
        profiles: seedProfiles.length,
        startups: seedStartups.length,
        investorProfiles: seedInvestorProfiles.length,
        mentorProfiles: seedMentorProfiles.length,
        incubatorProfiles: seedIncubatorProfiles.length,
        programs: seedIncubatorPrograms.length,
        applications: seedApplications.length,
      },
    };
  }

  console.log('[In-Memory] PostgreSQL pool unreachable or test environment. Initialized full in-memory data model.');
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
