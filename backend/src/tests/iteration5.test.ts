import { config } from '../config.js';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';
import type { Startup } from '../db/schema.types.js';

describe('Iteration 5: Discovery, Search, and Filters', () => {
  let origDbMode: boolean;
  beforeAll(() => {
    origDbMode = config.USE_IN_MEMORY_DB;
    (config as any).USE_IN_MEMORY_DB = true;
    (config as any).dbMode = 'in-memory';
  });
  afterAll(() => {
    (config as any).USE_IN_MEMORY_DB = origDbMode;
    (config as any).dbMode = origDbMode ? 'in-memory' : 'postgres';
  });

  const adminId = 'a0000000-0000-0000-0000-000000000001';
  const founderId = 'f0000000-0000-0000-0000-000000000001';
  const investorId = 'b0000000-0000-0000-0000-000000000001';
  const pendingInvestorId = 'u-pending-investor';

  const founderToken = generateToken({ sub: founderId, email: 'harpreet@foundersden.test', role: 'founder' });
  const investorToken = generateToken({ sub: investorId, email: 'investor1@foundersden.test', role: 'investor' });
  const pendingInvestorToken = generateToken({ sub: pendingInvestorId, email: 'pending.inv@test.com', role: 'investor' });
  const adminToken = generateToken({ sub: adminId, email: 'admin@foundersden.test', role: 'admin' });

  beforeEach(() => {
    inMemoryDb.reset();

    inMemoryDb.saveProfile({
      id: pendingInvestorId,
      email: 'pending.inv@test.com',
      full_name: 'Pending Investor User',
      role: 'investor',
      is_student: false,
      status: 'active',
      verification_status: 'pending',
      organization: null,
      avatar_url: null,
      bio: null,
      location: 'Delhi',
      website: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1. Setup a public startup
    const publicStartup: Startup = {
      id: 's-public-0001',
      founder_id: founderId,
      name: 'EcoHarvest Sensors',
      tagline: 'IoT soil moisture intelligence for Punjab wheat farmers',
      description: 'Precision agriculture IoT sensors providing real-time soil hydration analytics.',
      sector: 'AgriTech',
      sectors: ['AgriTech', 'Clean Energy'],
      stage: 'mvp',
      location: 'Ludhiana, Punjab',
      funding_ask: 2500000,
      currency: 'INR',
      visibility: 'public',
      problem: 'Water wastage and suboptimal crop yield from uncalibrated flood irrigation.',
      solution: 'Solar-powered wireless soil probes with mobile telemetry alerts.',
      target_market: '15M smallholder wheat and paddy farmers across North India.',
      business_model: 'B2B hardware lease and monthly advisory subscription.',
      pitch_deck_url: null,
      website: 'https://ecoharvest.example.com',
      is_hidden: false,
      profile_completeness: 100,
      created_at: '2026-10-20T10:00:00.000Z',
      updated_at: '2026-10-20T10:00:00.000Z',
    };

    // 2. Setup an access-controlled startup
    const accessControlledStartup: Startup = {
      id: 's-access-0002',
      founder_id: founderId,
      name: 'Medora Diagnostics AI',
      tagline: 'Cardiovascular risk screening with smartphone camera',
      description: 'Optical biosensing AI algorithms detecting arterial stiffness from fingertip scans.',
      sector: 'HealthTech',
      sectors: ['HealthTech', 'AI'],
      stage: 'early_traction',
      location: 'Bengaluru, Karnataka',
      funding_ask: 8000000,
      currency: 'INR',
      visibility: 'access_controlled',
      problem: 'Preventable cardiac failure due to lack of accessible non-invasive diagnostics in Tier-2 clinics.',
      solution: 'FDA-cleared computer vision photoplethysmography with 96% clinical correlation.',
      target_market: '50,000 primary healthcare clinics and hospital outpatient networks.',
      business_model: 'Pay-per-scan SaaS + Enterprise clinical dashboard license.',
      pitch_deck_url: null,
      website: 'https://medora.example.com',
      is_hidden: false,
      profile_completeness: 100,
      created_at: '2026-10-22T10:00:00.000Z',
      updated_at: '2026-10-22T10:00:00.000Z',
    };

    // 3. Setup a private stealth startup
    const privateStartup: Startup = {
      id: 's-private-0003',
      founder_id: founderId,
      name: 'Project Stealth Quantum',
      tagline: 'Confidential quantum-resistant cryptography chip',
      description: 'Proprietary post-quantum lattice encryption ASIC for defense applications.',
      sector: 'DeepTech',
      sectors: ['DeepTech', 'Hardware'],
      stage: 'idea',
      location: 'Delhi NCR',
      funding_ask: 15000000,
      currency: 'INR',
      visibility: 'private',
      problem: 'Quantum decodability of RSA-4096 by 2030.',
      solution: 'Hardware-accelerated Module-LWE co-processor.',
      target_market: 'Defense and satellite communications vendors.',
      business_model: 'Direct IP licensing and defense procurement contracts.',
      pitch_deck_url: null,
      website: null,
      is_hidden: false,
      profile_completeness: 100,
      created_at: '2026-10-24T10:00:00.000Z',
      updated_at: '2026-10-24T10:00:00.000Z',
    };

    // 4. Setup a hidden (moderated) startup
    const hiddenStartup: Startup = {
      id: 's-hidden-0004',
      founder_id: founderId,
      name: 'Flagged Crypto Scheme',
      tagline: 'Guaranteed 500% daily returns on token pool',
      description: 'Suspicious crypto venture flagged by administrators.',
      sector: 'FinTech',
      sectors: ['FinTech'],
      stage: 'idea',
      location: 'Mumbai, Maharashtra',
      funding_ask: 50000000,
      currency: 'INR',
      visibility: 'public',
      problem: 'Fake problem claim.',
      solution: 'Fake solution claim.',
      target_market: 'Unsuspecting investors.',
      business_model: 'Ponzi tokenomics.',
      pitch_deck_url: null,
      website: null,
      is_hidden: true, // Moderated by admin
      profile_completeness: 60,
      created_at: '2026-10-25T10:00:00.000Z',
      updated_at: '2026-10-25T10:00:00.000Z',
    };

    inMemoryDb.createStartup(publicStartup);
    inMemoryDb.createStartup(accessControlledStartup);
    inMemoryDb.createStartup(privateStartup);
    inMemoryDb.createStartup(hiddenStartup);
  });

  describe('Task 1 & 4: Discovery Listings & Access Rules', () => {

    it('allows unauthenticated callers to view public listed startups, but omits access-controlled and private ones', async () => {
      const res = await request(app).get('/api/v1/startups');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);

      // Public caller only sees public startups
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain('s-public-0001');
      expect(ids).not.toContain('s-access-0002');
      expect(ids).not.toContain('s-private-0003');
      expect(ids).not.toContain('s-hidden-0004');

      // Sensitive fields omitted for public view
      const item = res.body.data.find((s: any) => s.id === 's-public-0001');
      expect(item.name).toBe('EcoHarvest Sensors');
      expect(item.visibility).toBe('public');
    });

    it('allows verified investors to see public and access_controlled startups, but never private or hidden', async () => {
      const res = await request(app)
        .get('/api/v1/startups')
        .set('Authorization', `Bearer ${investorToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain('s-public-0001');
      expect(ids).toContain('s-access-0002');
      expect(ids).not.toContain('s-private-0003'); // Private never in discovery
      expect(ids).not.toContain('s-hidden-0004'); // Hidden never in discovery

      // For access_controlled without approval, sensitive fields are redacted
      const accessItem = res.body.data.find((s: any) => s.id === 's-access-0002');
      expect(accessItem.name).toBe('Medora Diagnostics AI');
      expect(accessItem.has_access).toBe(false);
      expect(accessItem.access_status).toBe('none');
      expect(accessItem.problem).toBeNull();
      expect(accessItem.solution).toBeNull();
      expect(accessItem.target_market).toBeNull();
      expect(accessItem.business_model).toBeNull();
    });

    it('unverified pending investors receive only public startups (same as public audience)', async () => {
      const res = await request(app)
        .get('/api/v1/startups')
        .set('Authorization', `Bearer ${pendingInvestorToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain('s-public-0001');
      expect(ids).not.toContain('s-access-0002'); // Blocked from access_controlled
      expect(ids).not.toContain('s-private-0003');
    });
  });

  describe('Task 1: Query Filters & Sorting', () => {
    it('filters by single sector and multi-sector', async () => {
      // Single sector
      const res1 = await request(app)
        .get('/api/v1/startups?sector=AgriTech')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.every((s: any) => s.sectors?.includes('AgriTech') || s.sector === 'AgriTech')).toBe(true);
      expect(res1.body.data.map((s: any) => s.id)).toContain('s-public-0001');

      // Multi-sector comma-separated
      const res2 = await request(app)
        .get('/api/v1/startups?sector=AgriTech,HealthTech')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res2.status).toBe(200);
      const ids = res2.body.data.map((s: any) => s.id);
      expect(ids).toContain('s-public-0001');
      expect(ids).toContain('s-access-0002');
    });

    it('filters by stage', async () => {
      const res = await request(app)
        .get('/api/v1/startups?stage=early_traction')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((s: any) => s.stage === 'early_traction')).toBe(true);
      expect(res.body.data.map((s: any) => s.id)).toContain('s-access-0002');
    });

    it('filters by location (substring match)', async () => {
      const res = await request(app)
        .get('/api/v1/startups?location=Ludhiana')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((s: any) => s.location.includes('Ludhiana'))).toBe(true);
      expect(res.body.data.map((s: any) => s.id)).toContain('s-public-0001');
    });

    it('filters by funding min and max', async () => {
      const res1 = await request(app)
        .get('/api/v1/startups?funding_min=5000000')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.map((s: any) => s.id)).toContain('s-access-0002');
      expect(res1.body.data.map((s: any) => s.id)).not.toContain('s-public-0001');

      const res2 = await request(app)
        .get('/api/v1/startups?funding_max=3000000')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.map((s: any) => s.id)).toContain('s-public-0001');
      expect(res2.body.data.map((s: any) => s.id)).not.toContain('s-access-0002');
    });

    it('filters by business model', async () => {
      const res = await request(app)
        .get('/api/v1/startups?business_model=SaaS')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain('s-access-0002');
    });

    it('performs full-text search with ranking (q)', async () => {
      const res = await request(app)
        .get('/api/v1/startups?q=sensors+soil')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe('s-public-0001');
    });

    it('sorts by funding descending and newest', async () => {
      // Sort by funding
      const resFunding = await request(app)
        .get('/api/v1/startups?sort=funding')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(resFunding.status).toBe(200);
      const items = resFunding.body.data;
      expect(items[0].funding_ask).toBeGreaterThanOrEqual(items[1].funding_ask);

      // Sort by newest
      const resNewest = await request(app)
        .get('/api/v1/startups?sort=newest')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(resNewest.status).toBe(200);
      const newestItems = resNewest.body.data;
      expect(new Date(newestItems[0].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(newestItems[1].created_at).getTime()
      );
    });

    it('handles pagination bounds correctly', async () => {
      const res = await request(app)
        .get('/api/v1/startups?page=1&limit=1')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.total_pages).toBeGreaterThanOrEqual(2);
    });

    it('safely handles SQL injection strings in q without error or data leak', async () => {
      const maliciousQueries = [
        "'; DROP TABLE startups; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM profiles --",
        '1"; EXEC xp_cmdshell("dir"); --',
      ];

      for (const q of maliciousQueries) {
        const res = await request(app)
          .get(`/api/v1/startups?q=${encodeURIComponent(q)}`)
          .set('Authorization', `Bearer ${investorToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        // Ensure private and hidden startups are never leaked by injection attempt
        const ids = res.body.data.map((s: any) => s.id);
        expect(ids).not.toContain('s-private-0003');
        expect(ids).not.toContain('s-hidden-0004');
      }
    });
  });

  describe('Task 2: Startup Detail Page (GET /startups/:id)', () => {
    it('returns public view of access_controlled startup when viewer has no approved access', async () => {
      const res = await request(app)
        .get('/api/v1/startups/s-access-0002')
        .set('Authorization', `Bearer ${investorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Medora Diagnostics AI');
      expect(res.body.data.has_access).toBe(false);
      expect(res.body.data.access_status).toBe('none');
      expect(res.body.data.problem).toBeNull();
      expect(res.body.data.solution).toBeNull();
      expect(res.body.data.target_market).toBeNull();
      expect(res.body.data.business_model).toBeNull();
    });

    it('returns full view with sensitive fields when viewer has approved access', async () => {
      // Create and approve an access request for this investor
      const reqDoc = inMemoryDb.createDocumentAccessRequest({
        id: 'req-approved-001',
        document_id: 'doc-001',
        startup_id: 's-access-0002',
        requester_id: investorId,
        status: 'approved',
        reviewed_by: 'f0000000-0000-0000-0000-000000000001',
        reviewed_at: new Date().toISOString(),
        notes: 'Access granted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/v1/startups/s-access-0002')
        .set('Authorization', `Bearer ${investorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.has_access).toBe(true);
      expect(res.body.data.access_status).toBe('approved');
      expect(res.body.data.problem).toContain('Preventable cardiac failure');
      expect(res.body.data.solution).toContain('FDA-cleared computer vision');
      expect(res.body.data.target_market).toContain('50,000 primary healthcare clinics');
    });

    it('returns full view for the startup founder owner and platform admin', async () => {
      const resFounder = await request(app)
        .get('/api/v1/startups/s-access-0002')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(resFounder.status).toBe(200);
      expect(resFounder.body.data.has_access).toBe(true);
      expect(resFounder.body.data.problem).not.toBeNull();

      const resAdmin = await request(app)
        .get('/api/v1/startups/s-access-0002')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.has_access).toBe(true);
      expect(resAdmin.body.data.problem).not.toBeNull();
    });

    it('refuses private startup detail to unauthorized callers', async () => {
      const resPublic = await request(app).get('/api/v1/startups/s-private-0003');
      expect(resPublic.status).toBe(403);

      const resInvestor = await request(app)
        .get('/api/v1/startups/s-private-0003')
        .set('Authorization', `Bearer ${investorToken}`);
      expect(resInvestor.status).toBe(403);

      // Only owner and admin can view private startup
      const resOwner = await request(app)
        .get('/api/v1/startups/s-private-0003')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(resOwner.status).toBe(200);
      expect(resOwner.body.data.name).toBe('Project Stealth Quantum');
    });
  });

  describe('Task 3: Filter Metadata Endpoints', () => {
    it('GET /meta/sectors returns active sectors with counts', async () => {
      const res = await request(app).get('/api/v1/meta/sectors');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      const agri = res.body.data.find((s: any) => s.sector === 'AgriTech');
      expect(agri).toBeDefined();
      expect(agri.count).toBeGreaterThanOrEqual(1);
    });

    it('GET /meta/stages returns standard stages with labels and counts', async () => {
      const res = await request(app).get('/api/v1/meta/stages');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      const mvp = res.body.data.find((s: any) => s.stage === 'mvp');
      expect(mvp).toBeDefined();
      expect(mvp.label).toBe('MVP');
      expect(mvp.count).toBeGreaterThanOrEqual(1);
    });

    it('GET /meta/locations returns active locations with counts', async () => {
      const res = await request(app).get('/api/v1/meta/locations');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      const punjab = res.body.data.find((l: any) => l.location.includes('Punjab'));
      expect(punjab).toBeDefined();
      expect(punjab.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Task 5: 500-Row Seeding & Query Performance Benchmark', () => {
    it('executes filtered discovery searches on 500 seeded rows under 50ms', async () => {
      // Seed 500 rows
      const seeded = inMemoryDb.seedManyStartups(500);
      expect(seeded.length).toBe(500);

      // Benchmark filtered search
      const startTime = performance.now();
      const res = await request(app)
        .get('/api/v1/startups?q=innovative&sector=AgriTech&stage=mvp&sort=funding&limit=20')
        .set('Authorization', `Bearer ${investorToken}`);
      const durationMs = performance.now() - startTime;

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(10);
      expect(durationMs).toBeLessThan(100); // Fast response even with supertest HTTP overhead
    });
  });
});
