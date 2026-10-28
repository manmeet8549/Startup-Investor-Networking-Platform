import pg from 'pg';
import { supabaseAdmin } from './supabase.js';
import { config } from '../config.js';
import { inMemoryDb } from './index.js';
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

export async function runSeed(): Promise<void> {
  console.log('--- [Founders Den] Starting Seed Script ---');
  console.log(`Active DB mode: ${config.dbMode}`);

  if (config.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('BLOCKED: Database seeding is refused in production unless ALLOW_SEED=true is set.');
  }

  // Always reset and seed inMemoryDb
  inMemoryDb.reset();

  if (config.USE_IN_MEMORY_DB || !config.DATABASE_URL) {
    console.log('[Seed] In-Memory DB populated successfully with demo data.');
    return;
  }

  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.DATABASE_URL.includes('supabase.co') || config.DATABASE_URL.includes('pooler.supabase.com')
      ? { rejectUnauthorized: false }
      : false,
  });

  const client = await pool.connect();

  try {
    console.log('[Seed] Step 1: Creating/updating demo users via Supabase Auth Admin API...');
    for (const p of seedProfiles) {
      try {
        const { error } = await supabaseAdmin.auth.admin.createUser({
          id: p.id,
          email: p.email,
          password: 'Password123!',
          email_confirm: true,
          user_metadata: {
            full_name: p.full_name,
            role: p.role,
          },
        });

        if (error) {
          // If already exists or 422, update user password and metadata
          if (error.message.includes('already registered') || (error as any).status === 422) {
            await supabaseAdmin.auth.admin.updateUserById(p.id, {
              password: 'Password123!',
              email_confirm: true,
              user_metadata: {
                full_name: p.full_name,
                role: p.role,
              },
            });
            console.log(`[Seed Auth] Updated existing user: ${p.email}`);
          } else {
            console.warn(`[Seed Auth] Notice for ${p.email}:`, error.message);
          }
        } else {
          console.log(`[Seed Auth] Created user: ${p.email}`);
        }
      } catch (authErr: any) {
        console.warn(`[Seed Auth] Admin API call note for ${p.email}:`, authErr.message);
      }

      // Ensure auth.users has the full Supabase auth record
      try {
        await client.query(
          `INSERT INTO auth.users (
             instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
             raw_app_meta_data, raw_user_meta_data, created_at, updated_at
           )
           VALUES (
             '00000000-0000-0000-0000-000000000000',
             $1,
             'authenticated',
             'authenticated',
             $2,
             extensions.crypt('Password123!', extensions.gen_salt('bf')),
             now(),
             '{"provider":"email","providers":["email"]}'::jsonb,
             $3::jsonb,
             now(),
             now()
           )
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             encrypted_password = EXCLUDED.encrypted_password,
             email_confirmed_at = EXCLUDED.email_confirmed_at,
             raw_user_meta_data = EXCLUDED.raw_user_meta_data,
             updated_at = now()`,
          [p.id, p.email, JSON.stringify({ full_name: p.full_name, role: p.role })]
        );
      } catch (authSqlErr: any) {
        console.warn(`[Seed Auth] auth.users SQL insert notice for ${p.email}:`, authSqlErr.message);
      }
    }

    console.log('[Seed] Step 2: Inserting/updating public.profiles...');
    for (const p of seedProfiles) {
      await client.query(
        `INSERT INTO public.profiles (
          id, email, full_name, role, is_student, organization, bio, location, website, status, verification_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          is_student = EXCLUDED.is_student,
          organization = EXCLUDED.organization,
          bio = EXCLUDED.bio,
          location = EXCLUDED.location,
          website = EXCLUDED.website,
          status = EXCLUDED.status,
          verification_status = EXCLUDED.verification_status,
          updated_at = EXCLUDED.updated_at`,
        [
          p.id,
          p.email,
          p.full_name,
          p.role,
          p.is_student,
          p.organization,
          p.bio,
          p.location,
          p.website,
          p.status,
          p.verification_status,
          p.created_at,
          p.updated_at,
        ]
      );
    }

    console.log('[Seed] Step 3: Inserting/updating role profiles...');
    // Founder profiles
    for (const fp of seedFounderProfiles) {
      await client.query(
        `INSERT INTO public.founder_profiles (user_id, headline, linkedin_url, bio, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           headline = EXCLUDED.headline,
           linkedin_url = EXCLUDED.linkedin_url,
           bio = EXCLUDED.bio,
           updated_at = EXCLUDED.updated_at`,
        [fp.user_id, fp.headline, fp.linkedin_url, fp.bio, fp.created_at, fp.updated_at]
      );
    }

    // Investor profiles
    for (const ip of seedInvestorProfiles) {
      await client.query(
        `INSERT INTO public.investor_profiles (
          user_id, firm_name, sectors, stages, ticket_min, ticket_max, regions, business_models, thesis, accredited, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id) DO UPDATE SET
          firm_name = EXCLUDED.firm_name,
          sectors = EXCLUDED.sectors,
          stages = EXCLUDED.stages,
          ticket_min = EXCLUDED.ticket_min,
          ticket_max = EXCLUDED.ticket_max,
          regions = EXCLUDED.regions,
          business_models = EXCLUDED.business_models,
          thesis = EXCLUDED.thesis,
          accredited = EXCLUDED.accredited,
          updated_at = EXCLUDED.updated_at`,
        [
          ip.user_id,
          ip.firm_name,
          ip.sectors,
          ip.stages,
          ip.ticket_min,
          ip.ticket_max,
          ip.regions,
          ip.business_models,
          ip.thesis,
          ip.accredited ?? true,
          ip.created_at,
          ip.updated_at,
        ]
      );
    }

    // Mentor profiles
    for (const mp of seedMentorProfiles) {
      await client.query(
        `INSERT INTO public.mentor_profiles (user_id, expertise, experience, linkedin_url, bio, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           expertise = EXCLUDED.expertise,
           experience = EXCLUDED.experience,
           linkedin_url = EXCLUDED.linkedin_url,
           bio = EXCLUDED.bio,
           updated_at = EXCLUDED.updated_at`,
        [mp.user_id, mp.expertise, mp.experience, mp.linkedin_url, mp.bio, mp.created_at, mp.updated_at]
      );
    }

    // Incubator profiles
    for (const cp of seedIncubatorProfiles) {
      await client.query(
        `INSERT INTO public.incubator_profiles (user_id, organization_name, website, focus_sectors, cohort_size, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           organization_name = EXCLUDED.organization_name,
           website = EXCLUDED.website,
           focus_sectors = EXCLUDED.focus_sectors,
           cohort_size = EXCLUDED.cohort_size,
           updated_at = EXCLUDED.updated_at`,
        [cp.user_id, cp.organization_name, cp.website, cp.focus_sectors, cp.cohort_size, cp.created_at, cp.updated_at]
      );
    }

    console.log('[Seed] Step 4: Inserting/updating startups...');
    for (const s of seedStartups) {
      const startupSectors = s.sectors && s.sectors.length > 0 ? s.sectors : [s.sector];
      await client.query(
        `INSERT INTO public.startups (
          id, founder_id, name, tagline, description, sector, sectors, stage, location, funding_ask, currency, visibility, pitch_deck_url, website, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          tagline = EXCLUDED.tagline,
          description = EXCLUDED.description,
          sector = EXCLUDED.sector,
          sectors = EXCLUDED.sectors,
          stage = EXCLUDED.stage,
          location = EXCLUDED.location,
          funding_ask = EXCLUDED.funding_ask,
          visibility = EXCLUDED.visibility,
          pitch_deck_url = EXCLUDED.pitch_deck_url,
          website = EXCLUDED.website,
          updated_at = EXCLUDED.updated_at`,
        [
          s.id,
          s.founder_id,
          s.name,
          s.tagline,
          s.description,
          s.sector,
          startupSectors,
          s.stage,
          s.location,
          s.funding_ask,
          s.currency,
          s.visibility,
          s.pitch_deck_url,
          s.website,
          s.created_at,
          s.updated_at,
        ]
      );
    }

    console.log('[Seed] Step 5: Inserting/updating programs and applications...');
    for (const prog of seedIncubatorPrograms) {
      await client.query(
        `INSERT INTO public.incubator_programs (
          id, incubator_id, name, description, benefits, sectors, stages, deadline, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          benefits = EXCLUDED.benefits,
          sectors = EXCLUDED.sectors,
          stages = EXCLUDED.stages,
          deadline = EXCLUDED.deadline,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at`,
        [
          prog.id,
          prog.incubator_id,
          prog.name,
          prog.description,
          prog.benefits,
          prog.sectors,
          prog.stages,
          prog.deadline,
          prog.is_active,
          prog.created_at,
          prog.updated_at,
        ]
      );
    }

    for (const app of seedApplications) {
      await client.query(
        `INSERT INTO public.applications (
          id, program_id, startup_id, founder_id, pitch_summary, status, decision_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          pitch_summary = EXCLUDED.pitch_summary,
          status = EXCLUDED.status,
          decision_notes = EXCLUDED.decision_notes,
          updated_at = EXCLUDED.updated_at`,
        [
          app.id,
          app.program_id,
          app.startup_id,
          app.founder_id,
          app.pitch_summary,
          app.status,
          app.decision_notes,
          app.created_at,
          app.updated_at,
        ]
      );
    }

    console.log('[Seed] Step 6: Inserting/updating documents, watchlist, notes, and messages...');
    for (const doc of seedDocuments) {
      await client.query(
        `INSERT INTO public.documents (
          id, startup_id, uploader_id, title, file_path, file_type, file_size, version, visibility, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          file_path = EXCLUDED.file_path,
          version = EXCLUDED.version,
          visibility = EXCLUDED.visibility,
          updated_at = EXCLUDED.updated_at`,
        [
          doc.id,
          doc.startup_id,
          doc.uploader_id,
          doc.title,
          doc.file_path,
          doc.file_type,
          doc.file_size,
          doc.version,
          doc.visibility,
          doc.created_at,
          doc.updated_at,
        ]
      );
    }

    for (const w of seedWatchlist) {
      await client.query(
        `INSERT INTO public.watchlist (id, investor_id, startup_id, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [w.id, w.investor_id, w.startup_id, w.created_at]
      );
    }

    for (const n of seedInvestorNotes) {
      await client.query(
        `INSERT INTO public.investor_notes (id, investor_id, startup_id, note, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note, updated_at = EXCLUDED.updated_at`,
        [n.id, n.investor_id, n.startup_id, n.note, n.created_at, n.updated_at]
      );
    }

    for (const m of seedMessages) {
      await client.query(
        `INSERT INTO public.messages (id, sender_id, recipient_id, content, read_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.sender_id, m.recipient_id, m.content, m.read_at, m.created_at]
      );
    }

    console.log('[Seed] Seeding completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed()
    .then(() => {
      console.log('[Seed] Process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Process error:', err);
      process.exit(1);
    });
}
