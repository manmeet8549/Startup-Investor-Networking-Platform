import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { config } from '../config.js';
import { query } from '../db/index.js';
import { supabaseClient, supabaseAdmin } from '../db/supabase.js';
import { generateToken } from '../middleware/auth.middleware.js';

describe('Real PostgreSQL Integration & Metadata & Auth Suite', () => {
  beforeAll(async () => {
    // Assert strictly running against real postgres
    expect(config.dbMode).toBe('postgres');
    expect(config.USE_IN_MEMORY_DB).toBe(false);

    // Ensure startups sectors array is populated for unnest testing
    await query("UPDATE public.startups SET sectors = ARRAY[sector] WHERE sectors = '{}' OR sectors IS NULL");
  });

  describe('Task 3: Aggregation & Metadata Endpoints against Real PostgreSQL', () => {
    it('GET /api/v1/meta/sectors counts sectors via unnest(sectors) AS s ... GROUP BY s', async () => {
      const res = await request(app).get('/api/v1/meta/sectors');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify shape: { sector: string, count: number }
      for (const item of res.body.data) {
        expect(typeof item.sector).toBe('string');
        expect(typeof item.count).toBe('number');
      }

      const sectors = res.body.data.map((x: any) => x.sector);
      expect(sectors).toContain('AgriTech');
    });

    it('GET /api/v1/meta/stages returns all 5 standard stages with count', async () => {
      const res = await request(app).get('/api/v1/meta/stages');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);

      const stages = res.body.data.map((s: any) => s.stage);
      expect(stages).toEqual(
        expect.arrayContaining(['idea', 'validation', 'mvp', 'early_traction', 'growth'])
      );
    });

    it('GET /api/v1/meta/locations returns active startup locations', async () => {
      const res = await request(app).get('/api/v1/meta/locations');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const loc of res.body.data) {
        expect(typeof loc.location).toBe('string');
        expect(typeof loc.count).toBe('number');
      }
    });
  });

  describe('Task 5 & 6: POST /auth/register-profile JWT Verification & Real Supabase Auth Flow', () => {
    const testEmail = `vitest.founder.${Date.now()}@gmail.com`;
    const testPassword = 'Password123!';
    let createdAuthUserId: string | null = null;
    let supabaseAccessToken: string | null = null;

    it('rejects POST /auth/register-profile with 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-profile')
        .send({
          email: 'noauth@foundersden.test',
          full_name: 'No Auth User',
          role: 'founder',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns a clear 404 (4xx, not 500) when auth user does not exist in auth.users', async () => {
      const nonExistentUserId = '99999999-9999-4999-8999-999999999999';
      const fakeToken = generateToken({
        sub: nonExistentUserId,
        email: 'ghost@foundersden.test',
      });

      const res = await request(app)
        .post('/api/v1/auth/register-profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          email: 'ghost@foundersden.test',
          full_name: 'Ghost User',
          role: 'founder',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('AUTH_USER_NOT_FOUND');
      expect(res.body.error.message).toContain('Auth user does not exist');
    });

    it('executes full signup with real Supabase Auth user, registers profile, and verifies via GET /api/v1/me', async () => {
      // 1. Create real user via Supabase Auth
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Vitest Test Founder',
            role: 'founder',
          },
        },
      });

      expect(signUpError).toBeNull();
      expect(signUpData.user).toBeDefined();
      expect(signUpData.user?.id).toBeDefined();
      createdAuthUserId = signUpData.user!.id;
      supabaseAccessToken = signUpData.session?.access_token || null;

      // If session was not returned immediately, sign in with credentials
      if (!supabaseAccessToken) {
        const { data: signInData, error: signInErr } = await supabaseClient.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        expect(signInErr).toBeNull();
        supabaseAccessToken = signInData.session!.access_token;
      }

      expect(supabaseAccessToken).toBeTruthy();

      // 2. Register profile in Founders Den backend using the verified Supabase token
      const regRes = await request(app)
        .post('/api/v1/auth/register-profile')
        .set('Authorization', `Bearer ${supabaseAccessToken}`)
        .send({
          email: testEmail,
          full_name: 'Vitest Test Founder',
          role: 'founder',
          organization: 'Vitest Innovations Inc',
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.data.profile.id).toBe(createdAuthUserId);
      expect(regRes.body.data.profile.role).toBe('founder');
      expect(regRes.body.data.profile.verification_status).toBe('verified');

      // 3. Verify public.profiles in real PostgreSQL
      const profileRow = await query<{ id: string; email: string; full_name: string }>(
        'SELECT id, email, full_name FROM public.profiles WHERE id = $1',
        [createdAuthUserId]
      );
      expect(profileRow.rows.length).toBe(1);
      expect(profileRow.rows[0].id).toBe(createdAuthUserId);
      expect(profileRow.rows[0].email).toBe(testEmail.toLowerCase());

      // 4. Verify public.founder_profiles exists in PostgreSQL
      const founderProfileRow = await query<{ user_id: string }>(
        'SELECT user_id FROM public.founder_profiles WHERE user_id = $1',
        [createdAuthUserId]
      );
      expect(founderProfileRow.rows.length).toBe(1);
      expect(founderProfileRow.rows[0].user_id).toBe(createdAuthUserId);

      // 5. Verify GET /api/v1/me returns the profile
      const meRes = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${supabaseAccessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.id).toBe(createdAuthUserId);
      expect(meRes.body.data.email).toBe(testEmail.toLowerCase());
      expect(meRes.body.data.role).toBe('founder');
    });

    afterAll(async () => {
      // Clean up test user from postgres and Supabase Auth
      if (createdAuthUserId) {
        try {
          await query('DELETE FROM public.founder_profiles WHERE user_id = $1', [createdAuthUserId]);
          await query('DELETE FROM public.profiles WHERE id = $1', [createdAuthUserId]);
          await query('DELETE FROM auth.identities WHERE user_id = $1', [createdAuthUserId]);
          await query('DELETE FROM auth.users WHERE id = $1', [createdAuthUserId]);
          if (supabaseAdmin) {
            await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => null);
          }
        } catch (cleanupErr: any) {
          console.warn('Test cleanup notice:', cleanupErr.message);
        }
      }
    });
  });
});
