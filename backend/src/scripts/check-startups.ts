import { query, closePool } from '../db/pool.js';

async function main() {
  const all = await query(`
    SELECT s.id, s.name, s.visibility, s.is_hidden, p.verification_status, p.status as profile_status
    FROM public.startups s
    LEFT JOIN public.profiles p ON s.founder_id = p.id
  `);
  console.log(`\n=== All Startups in DB (${all.rows.length}) ===`);
  console.table(all.rows);

  const visiblePublic = await query(`
    SELECT s.id, s.name, s.visibility, s.is_hidden, p.verification_status, p.status as profile_status
    FROM public.startups s
    LEFT JOIN public.profiles p ON s.founder_id = p.id
    WHERE s.is_hidden = false
      AND p.status != 'suspended'
      AND p.verification_status = 'verified'
      AND s.visibility = 'public'
  `);
  console.log(`\n=== Startups visible to unauthenticated /api/v1/startups (${visiblePublic.rows.length}) ===`);
  console.table(visiblePublic.rows);

  await closePool();
}

main().catch(console.error);
