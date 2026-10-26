// Founders Den MVP - Database Seed Script

import { resetAndSeedDatabase } from './reset.js';
import { closePool } from './pool.js';

resetAndSeedDatabase()
  .then((res) => {
    console.log('[Seed] Database seeding finished successfully:', res.summary);
    return closePool();
  })
  .catch((err) => {
    console.error('[Seed] Database seeding failed:', err);
    process.exit(1);
  });
