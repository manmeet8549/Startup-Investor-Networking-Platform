import { config } from '../config.js';
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';
import {
  calculateMatchScore,
  DEFAULT_WEIGHTS,
  scoreIndustry,
  scoreStage,
  scoreFunding,
  scoreLocation,
  scoreBusinessModel,
  MATCHING_DISCLAIMER,
} from '../matching/score.js';

describe('Iteration 6: Smart Matching & Investor Preferences', () => {
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


  beforeEach(() => {
    inMemoryDb.reset();
  });

  describe('1. Pure Matching Module Unit Tests', () => {
    it('verifies weights sum to exactly 100', () => {
      const sum =
        DEFAULT_WEIGHTS.industry +
        DEFAULT_WEIGHTS.stage +
        DEFAULT_WEIGHTS.funding +
        DEFAULT_WEIGHTS.location +
        DEFAULT_WEIGHTS.business_model;
      expect(sum).toBe(100);
      expect(DEFAULT_WEIGHTS.industry).toBe(30);
      expect(DEFAULT_WEIGHTS.stage).toBe(25);
      expect(DEFAULT_WEIGHTS.funding).toBe(20);
      expect(DEFAULT_WEIGHTS.location).toBe(15);
      expect(DEFAULT_WEIGHTS.business_model).toBe(10);
    });

    describe('Industry Scoring (Weight 30)', () => {
      const cases = [
        { startup: ['AgriTech'], investor: ['AgriTech'], expected: 100 },
        { startup: ['AgriTech', 'Climate Tech'], investor: ['AgriTech'], expected: 50 },
        { startup: ['AgriTech', 'AI'], investor: ['FinTech', 'EdTech'], expected: 0 },
        { startup: ['agritech'], investor: ['AgriTech', 'HealthTech'], expected: 100 },
        { startup: [], investor: ['AgriTech'], expected: 0 },
        { startup: ['AgriTech'], investor: [], expected: 0 },
      ];

      for (const c of cases) {
        it(`scores industry correctly for startup [${c.startup}] & investor [${c.investor}] -> ${c.expected}`, () => {
          const res = scoreIndustry(c.startup, c.investor);
          expect(res.score).toBe(c.expected);
        });
      }
    });

    describe('Stage Scoring (Weight 25)', () => {
      const cases = [
        { startup: 'mvp', investor: ['mvp'], expected: 100, label: 'exact mvp' },
        { startup: 'mvp', investor: ['Seed'], expected: 100, label: 'exact mvp to seed label' },
        { startup: 'mvp', investor: ['early_traction'], expected: 50, label: 'adjacent mvp to early_traction' },
        { startup: 'mvp', investor: ['validation'], expected: 50, label: 'adjacent mvp to validation' },
        { startup: 'idea', investor: ['growth'], expected: 0, label: 'distant idea to growth' },
        { startup: 'mvp', investor: ['idea'], expected: 0, label: 'distant mvp to idea (diff 2)' },
      ];

      for (const c of cases) {
        it(`scores stage: ${c.label} -> ${c.expected}`, () => {
          const res = scoreStage(c.startup, c.investor);
          expect(res.score).toBe(c.expected);
        });
      }
    });

    describe('Funding Ask Scoring (Weight 20)', () => {
      const min = 1000000; // 10L
      const max = 5000000; // 50L

      const cases = [
        { ask: 1500000, expected: 100, desc: 'within range (15L in [10L, 50L])' },
        { ask: 1000000, expected: 100, desc: 'exact lower boundary (10L)' },
        { ask: 5000000, expected: 100, desc: 'exact upper boundary (50L)' },
        { ask: 500000, expected: 50, desc: 'below min: 5L ask / 10L min = 50%' },
        { ask: 800000, expected: 80, desc: 'below min: 8L ask / 10L min = 80%' },
        { ask: 10000000, expected: 50, desc: 'above max: 50L max / 100L ask = 50%' },
      ];

      for (const c of cases) {
        it(`scores funding: ${c.desc} -> ${c.expected}`, () => {
          const res = scoreFunding(c.ask, min, max);
          expect(res.score).toBe(c.expected);
        });
      }
    });

    describe('Location Scoring (Weight 15)', () => {
      const cases = [
        { loc: 'Ludhiana, Punjab, India', regions: ['Ludhiana'], expected: 100, desc: 'same city' },
        { loc: 'Ludhiana, Punjab, India', regions: ['Punjab'], expected: 80, desc: 'same state' },
        { loc: 'Ludhiana, Punjab, India', regions: ['North India'], expected: 80, desc: 'same region' },
        { loc: 'Ludhiana, Punjab, India', regions: ['India'], expected: 60, desc: 'same country' },
        { loc: 'Ludhiana, Punjab, India', regions: ['Pan-India'], expected: 60, desc: 'open pan-india' },
        { loc: 'Ludhiana, Punjab, India', regions: ['Global'], expected: 60, desc: 'open to any region' },
        { loc: 'Bengaluru, Karnataka, India', regions: ['Punjab'], expected: 0, desc: 'different geography' },
      ];

      for (const c of cases) {
        it(`scores location: ${c.desc} -> ${c.expected}`, () => {
          const res = scoreLocation(c.loc, c.regions);
          expect(res.score).toBe(c.expected);
        });
      }
    });

    describe('Business Model Scoring (Weight 10)', () => {
      it('returns neutral 50 if investor has no preference', () => {
        const res = scoreBusinessModel('B2B SaaS', []);
        expect(res.score).toBe(50);
      });

      it('returns 100 if startup business model overlaps with investor preferences', () => {
        const res = scoreBusinessModel('B2B Sensor Lease', ['B2B', 'Marketplace']);
        expect(res.score).toBe(100);
      });

      it('returns 0 if no overlap exists', () => {
        const res = scoreBusinessModel('D2C Retail', ['B2B', 'SaaS']);
        expect(res.score).toBe(0);
      });
    });

    it('returns score bounded 0-100, breakdown, reasons and disclaimer', () => {
      const res = calculateMatchScore(
        {
          sector: 'AgriTech',
          sectors: ['AgriTech', 'Climate Tech'],
          stage: 'mvp',
          funding_ask: 1500000,
          location: 'Ludhiana, Punjab, India',
          business_model: 'B2B',
        },
        {
          sectors: ['AgriTech', 'Climate Tech', 'AI'],
          stages: ['Seed', 'Early traction'],
          ticket_min: 1000000,
          ticket_max: 5000000,
          regions: ['Punjab', 'North India'],
          business_models: ['B2B'],
        }
      );

      expect(res.score).toBeGreaterThanOrEqual(0);
      expect(res.score).toBeLessThanOrEqual(100);
      expect(res.breakdown.industry.weight).toBe(30);
      expect(res.breakdown.stage.weight).toBe(25);
      expect(res.breakdown.funding.weight).toBe(20);
      expect(res.breakdown.location.weight).toBe(15);
      expect(res.breakdown.business_model.weight).toBe(10);
      expect(res.disclaimer).toBe(MATCHING_DISCLAIMER);
      expect(res.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('2. Investor Preferences API (Validation & Invalidation)', () => {
    const investorId = 'b0000000-0000-0000-0000-000000000001';
    const token = generateToken({ sub: investorId, email: 'northstar@foundersden.test', role: 'investor' });

    it('gets investor preferences', async () => {
      const res = await request(app)
        .get('/api/v1/investors/preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user_id).toBe(investorId);
      expect(res.body.data.sectors).toBeInstanceOf(Array);
      expect(res.body.data.ticket_min).toBeDefined();
    });

    it('rejects update when ticket_max < ticket_min', async () => {
      const res = await request(app)
        .put('/api/v1/investors/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sectors: ['AgriTech'],
          stages: ['mvp'],
          ticket_min: 5000000,
          ticket_max: 1000000, // Invalid! min > max
          regions: ['Punjab'],
          business_models: ['B2B'],
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });

    it('updates investor preferences and invalidates cached match_scores', async () => {
      // First, seed a cached match score
      inMemoryDb.saveMatchScore({
        id: `match-${investorId}-s001`,
        investor_id: investorId,
        startup_id: 's001',
        overall_score: 95,
        sector_score: 100,
        stage_score: 100,
        funding_score: 100,
        location_score: 80,
        model_score: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      expect(inMemoryDb.getCachedMatchScore(investorId, 's001')).not.toBeNull();

      const res = await request(app)
        .put('/api/v1/investors/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sectors: ['Climate Tech', 'Clean Energy'],
          stages: ['early_traction'],
          ticket_min: 2000000,
          ticket_max: 8000000,
          regions: ['Pan-India'],
          business_models: ['SaaS'],
          thesis: 'Updated climate thesis',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.sectors).toContain('Clean Energy');

      // Verify cached match scores for this investor were invalidated
      expect(inMemoryDb.getCachedMatchScore(investorId, 's001')).toBeNull();
    });
  });

  describe('3. Matching Rankings: Seeded AgriTech MVP Ranks AgriTech Angel First', () => {
    const founderId = 'f0000000-0000-0000-0000-000000000001';
    const founderToken = generateToken({ sub: founderId, email: 'manmeet@foundersden.test', role: 'founder' });
    const farmSenseId = 'e0000000-0000-0000-0000-000000000001';

    it('ranks the AgriTech angel (Northstar Ventures) first for FarmSense', async () => {
      const res = await request(app)
        .get(`/api/v1/matches/investors?startup_id=${farmSenseId}`)
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const topMatch = res.body.data[0];
      // Northstar Ventures is b0000000-0000-0000-0000-000000000001
      expect(topMatch.investor.id).toBe('b0000000-0000-0000-0000-000000000001');
      expect(topMatch.investor.organization).toContain('Northstar');
      expect(topMatch.score).toBeGreaterThanOrEqual(80);
      expect(topMatch.disclaimer).toBe(MATCHING_DISCLAIMER);
      expect(topMatch.breakdown).toBeDefined();
      expect(topMatch.reasons).toBeInstanceOf(Array);
      expect(topMatch.reasons.some((r: string) => r.toLowerCase().includes('agritech'))).toBe(true);
    });

    it('returns only verified investors', async () => {
      // Create a pending investor
      inMemoryDb.saveProfile({
        id: 'inv-pending-007',
        email: 'pending.angel@test.com',
        full_name: 'Pending Angel',
        role: 'investor',
        is_student: false,
        organization: 'Pending Fund',
        avatar_url: null,
        bio: 'Angel waiting for review',
        location: 'Punjab, India',
        website: null,
        status: 'active',
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      inMemoryDb.saveInvestorProfile({
        user_id: 'inv-pending-007',
        firm_name: 'Pending Fund',
        sectors: ['AgriTech'],
        stages: ['mvp'],
        ticket_min: 1000000,
        ticket_max: 5000000,
        regions: ['Punjab'],
        business_models: ['B2B'],
        thesis: 'Pending thesis',
        accredited: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await request(app)
        .get(`/api/v1/matches/investors?startup_id=${farmSenseId}`)
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      const investorIds = res.body.data.map((m: any) => m.investor.id);
      expect(investorIds).not.toContain('inv-pending-007');
    });

    it('enforces deterministic ordering and tie-breaking by id', async () => {
      const res = await request(app)
        .get(`/api/v1/matches/investors?startup_id=${farmSenseId}`)
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      const list = res.body.data;
      for (let i = 0; i < list.length - 1; i++) {
        if (list[i].score === list[i + 1].score) {
          expect(list[i].investor.id < list[i + 1].investor.id).toBe(true);
        } else {
          expect(list[i].score).toBeGreaterThan(list[i + 1].score);
        }
      }
    });

    it('invalidates cached matches when startup profile changes', async () => {
      // 1. Perform match query to populate cache
      await request(app)
        .get(`/api/v1/matches/investors?startup_id=${farmSenseId}`)
        .set('Authorization', `Bearer ${founderToken}`);

      expect(inMemoryDb.getCachedMatchScore('b0000000-0000-0000-0000-000000000001', farmSenseId)).not.toBeNull();

      // 2. Founder updates startup profile (e.g. changes funding ask or sectors)
      await request(app)
        .patch(`/api/v1/startups/${farmSenseId}`)
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          funding_ask: 30000000, // 3 Cr
        });

      // 3. Verify match cache was invalidated
      expect(inMemoryDb.getCachedMatchScore('b0000000-0000-0000-0000-000000000001', farmSenseId)).toBeNull();
    });
  });

  describe('4. Investor Startup Discovery Matching', () => {
    const investorId = 'b0000000-0000-0000-0000-000000000001';
    const investorToken = generateToken({ sub: investorId, email: 'northstar@foundersden.test', role: 'investor' });

    it('GET /matches/startups returns ranked startups with score breakdown and disclaimer', async () => {
      const res = await request(app)
        .get('/api/v1/matches/startups')
        .set('Authorization', `Bearer ${investorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.disclaimer).toBe(MATCHING_DISCLAIMER);

      const first = res.body.data[0];
      expect(first.startup.name).toBeDefined();
      expect(first.score).toBeGreaterThanOrEqual(0);
      expect(first.breakdown).toBeDefined();
      expect(first.breakdown.industry).toBeDefined();
      expect(first.breakdown.stage).toBeDefined();
      expect(first.breakdown.funding).toBeDefined();
      expect(first.breakdown.location).toBeDefined();
      expect(first.breakdown.business_model).toBeDefined();
    });

    it('excludes private and hidden startups from investor recommendations', async () => {
      // Create a private startup
      inMemoryDb.createStartup({
        id: 's-stealth-999',
        founder_id: 'f0000000-0000-0000-0000-000000000001',
        name: 'Stealth AgriTech',
        tagline: 'Private confidential idea',
        description: 'Stealth',
        sector: 'AgriTech',
        sectors: ['AgriTech'],
        stage: 'idea',
        location: 'Ludhiana, Punjab',
        funding_ask: 1500000,
        currency: 'INR',
        visibility: 'private',
        pitch_deck_url: null,
        website: null,
        is_hidden: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/v1/matches/startups')
        .set('Authorization', `Bearer ${investorToken}`);

      expect(res.status).toBe(200);
      const startupIds = res.body.data.map((m: any) => m.startup.id);
      expect(startupIds).not.toContain('s-stealth-999');
    });
  });
});
