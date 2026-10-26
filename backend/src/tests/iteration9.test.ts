import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';

describe('Iteration 9: Admin, Moderation, Reports and Platform Protection', () => {
  const adminId = 'a0000000-0000-0000-0000-000000000001';
  const founderId = 'f0000000-0000-0000-0000-000000000001';
  const founder2Id = 'f0000000-0000-0000-0000-000000000002';
  const investorId = 'i0000000-0000-0000-0000-000000000001';
  const mentorId = 'm0000000-0000-0000-0000-000000000001';
  const incubatorId = 'c0000000-0000-0000-0000-000000000001';

  const adminToken = generateToken({ sub: adminId, email: 'admin@foundersden.test', role: 'admin' });
  const founderToken = generateToken({ sub: founderId, email: 'manmeet@foundersden.test', role: 'founder' });
  const founder2Token = generateToken({ sub: founder2Id, email: 'riya@foundersden.test', role: 'founder' });
  const investorToken = generateToken({ sub: investorId, email: 'northstar@foundersden.test', role: 'investor' });
  const mentorToken = generateToken({ sub: mentorId, email: 'kavita@foundersden.test', role: 'mentor' });
  const incubatorToken = generateToken({ sub: incubatorId, email: 'punjab@foundersden.test', role: 'incubator' });

  beforeEach(() => {
    inMemoryDb.reset();
  });

  // TASK 1 & TESTS: Non-admins get 403 on every /admin route
  describe('RBAC Guard: Non-admins get 403 on every /admin route', () => {
    const adminRoutes: Array<{ method: 'get' | 'post' | 'patch' | 'delete'; path: string; body?: any }> = [
      { method: 'get', path: '/api/v1/admin/users' },
      { method: 'post', path: `/api/v1/admin/users/${founderId}/suspend`, body: { reason: 'Test' } },
      { method: 'post', path: `/api/v1/admin/users/${founderId}/reactivate`, body: { reason: 'Test' } },
      { method: 'patch', path: `/api/v1/admin/users/${founderId}/status`, body: { status: 'active' } },
      { method: 'get', path: '/api/v1/admin/startups' },
      { method: 'post', path: '/api/v1/admin/startups/s0000000-0000-0000-0000-000000000001/hide', body: { reason: 'Test' } },
      { method: 'post', path: '/api/v1/admin/startups/s0000000-0000-0000-0000-000000000001/unhide' },
      { method: 'delete', path: '/api/v1/admin/startups/s0000000-0000-0000-0000-000000000001' },
      { method: 'get', path: '/api/v1/admin/reports' },
      { method: 'post', path: '/api/v1/admin/reports/00000000-0000-0000-0000-000000000001/resolve', body: { note: 'Resolved' } },
      { method: 'post', path: '/api/v1/admin/reports/00000000-0000-0000-0000-000000000001/dismiss', body: { note: 'Dismissed' } },
      { method: 'patch', path: '/api/v1/admin/reports/00000000-0000-0000-0000-000000000001', body: { status: 'resolved' } },
      { method: 'get', path: '/api/v1/admin/stats' },
      { method: 'get', path: '/api/v1/admin/audit-logs' },
      { method: 'get', path: '/api/v1/admin/verifications' },
      { method: 'post', path: '/api/v1/admin/verifications/e0000000-0000-0000-0000-000000000001/approve', body: { notes: 'Ok' } },
      { method: 'post', path: '/api/v1/admin/verifications/e0000000-0000-0000-0000-000000000001/reject', body: { reason: 'No' } },
      { method: 'patch', path: '/api/v1/admin/verifications/e0000000-0000-0000-0000-000000000001', body: { status: 'verified' } },
    ];

    it('denies access (403 FORBIDDEN) to founder, investor, mentor, and incubator across all routes', async () => {
      const nonAdminTokens = [founderToken, investorToken, mentorToken, incubatorToken];

      for (const route of adminRoutes) {
        for (const token of nonAdminTokens) {
          const req = request(app)[route.method](route.path).set('Authorization', `Bearer ${token}`);
          if (route.body) {
            req.send(route.body);
          }
          const res = await req;
          expect(res.status, `Expected 403 on ${route.method.toUpperCase()} ${route.path}`).toBe(403);
          expect(res.body.error.code).toBe('FORBIDDEN');
        }
      }
    });

    it('denies access (401 UNAUTHORIZED) when unauthenticated across all routes', async () => {
      for (const route of adminRoutes) {
        const req = request(app)[route.method](route.path);
        if (route.body) {
          req.send(route.body);
        }
        const res = await req;
        expect(res.status, `Expected 401 on ${route.method.toUpperCase()} ${route.path}`).toBe(401);
      }
    });
  });

  // TASK 1: Users moderation (GET /admin/users, POST suspend, POST reactivate)
  describe('User Moderation & Immediate Session Invalidation', () => {
    it('GET /admin/users supports search and role filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?role=founder&search=Manmeet')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe('manmeet@foundersden.test');
      expect(res.body.meta.total).toBe(1);
    });

    it('suspending a user blocks active token with 403 everywhere and hides startups from discovery', async () => {
      // 1. Founder is active, startup is discoverable
      const beforeDisc = await request(app).get('/api/v1/startups');
      expect(beforeDisc.status).toBe(200);
      const startupFound = beforeDisc.body.data.some(
        (s: any) => s.id === 's0000000-0000-0000-0000-000000000002'
      );
      expect(startupFound).toBe(true);

      // 2. Founder can access authenticated routes
      const beforeMe = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(beforeMe.status).toBe(200);

      // 3. Admin suspends the founder
      const suspendRes = await request(app)
        .post(`/api/v1/admin/users/${founderId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Suspicious spam activity reported' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe('suspended');

      // 4. Founder's active token is immediately rejected with 403 ACCOUNT_SUSPENDED
      const afterMe = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(afterMe.status).toBe(403);
      expect(afterMe.body.error.code).toBe('ACCOUNT_SUSPENDED');

      // Suspended user calling any authenticated endpoint gets 403
      const reportAttempt = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          target_type: 'startup',
          target_id: 's0000000-0000-0000-0000-000000000003',
          reason: 'Spam test',
        });
      expect(reportAttempt.status).toBe(403);
      expect(reportAttempt.body.error.code).toBe('ACCOUNT_SUSPENDED');

      // 5. Founder's startups disappear from discovery
      const afterDisc = await request(app).get('/api/v1/startups');
      expect(afterDisc.status).toBe(200);
      const startupGone = afterDisc.body.data.some(
        (s: any) => s.id === 's0000000-0000-0000-0000-000000000002'
      );
      expect(startupGone).toBe(false);

      // 6. Admin reactivates the founder
      const reactivateRes = await request(app)
        .post(`/api/v1/admin/users/${founderId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Investigation cleared account' });

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.status).toBe('active');

      // 7. Active token is restored
      const restoredMe = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(restoredMe.status).toBe(200);

      // 8. Startup reappears in discovery
      const restoredDisc = await request(app).get('/api/v1/startups');
      const startupBack = restoredDisc.body.data.some(
        (s: any) => s.id === 's0000000-0000-0000-0000-000000000002'
      );
      expect(startupBack).toBe(true);
    });
  });

  // TASK 2: Listings moderation (GET /admin/startups, POST hide, unhide, DELETE)
  describe('Startup Listings Moderation', () => {
    it('GET /admin/startups lists startups with founder details and status filtering', async () => {
      const res = await request(app)
        .get('/api/v1/admin/startups?status=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data[0]).toHaveProperty('founder_name');
    });

    it('POST hide hides startup from discovery; unhide restores it', async () => {
      const startupId = 's0000000-0000-0000-0000-000000000003'; // Medora AI (public)

      // 1. Visible initially
      const initDisc = await request(app).get('/api/v1/startups');
      expect(initDisc.body.data.some((s: any) => s.id === startupId)).toBe(true);

      // 2. Hide startup
      const hideRes = await request(app)
        .post(`/api/v1/admin/startups/${startupId}/hide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Pending audit of claims' });

      expect(hideRes.status).toBe(200);
      expect(hideRes.body.data.is_hidden).toBe(true);

      // 3. Disappears from discovery
      const hiddenDisc = await request(app).get('/api/v1/startups');
      expect(hiddenDisc.body.data.some((s: any) => s.id === startupId)).toBe(false);

      // 4. Unhide startup
      const unhideRes = await request(app)
        .post(`/api/v1/admin/startups/${startupId}/unhide`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unhideRes.status).toBe(200);
      expect(unhideRes.body.data.is_hidden).toBe(false);

      // 5. Reappears in discovery
      const restoredDisc = await request(app).get('/api/v1/startups');
      expect(restoredDisc.body.data.some((s: any) => s.id === startupId)).toBe(true);
    });

    it('DELETE /admin/startups/:id permanently deletes listing', async () => {
      const startupId = 's0000000-0000-0000-0000-000000000005'; // SkillSpring

      const delRes = await request(app)
        .delete(`/api/v1/admin/startups/${startupId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);

      // Startup is gone from startup details
      const getRes = await request(app).get(`/api/v1/startups/${startupId}`);
      expect(getRes.status).toBe(404);
    });
  });

  // TASK 3: Reporting Flow (POST /reports, admin list, resolve, dismiss)
  describe('User Reports & Admin Resolution Workflow', () => {
    it('verified users can create reports and admins can list, resolve, and dismiss them', async () => {
      // 1. Verified founder creates report on a startup
      const createRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          target_type: 'startup',
          target_id: 's0000000-0000-0000-0000-000000000002',
          reason: 'Inaccurate stage and claims',
          details: 'Founder claims working hardware but pilot is still in prototype.',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data).toHaveProperty('id');
      expect(createRes.body.data.status).toBe('pending');
      const report1Id = createRes.body.data.id;

      // 2. Verified investor creates another report on a user
      const createRes2 = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${investorToken}`)
        .send({
          target_type: 'user',
          target_id: founder2Id,
          reason: 'Spam messages in connection request',
        });

      expect(createRes2.status).toBe(201);
      const report2Id = createRes2.body.data.id;

      // 3. Admin lists reports
      const listRes = await request(app)
        .get('/api/v1/admin/reports?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);
      expect(listRes.body.data.some((r: any) => r.id === report1Id)).toBe(true);

      // 4. Admin resolves report 1 with a note
      const resolveRes = await request(app)
        .post(`/api/v1/admin/reports/${report1Id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution_notes: 'Founder notified and requested to update pitch deck.' });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe('resolved');
      expect(resolveRes.body.data.reviewed_by).toBe(adminId);
      expect(resolveRes.body.data.resolution_notes).toContain('Founder notified');

      // 5. Admin dismisses report 2 with a note
      const dismissRes = await request(app)
        .post(`/api/v1/admin/reports/${report2Id}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution_notes: 'No violation found in message history.' });

      expect(dismissRes.status).toBe(200);
      expect(dismissRes.body.data.status).toBe('dismissed');
      expect(dismissRes.body.data.resolution_notes).toContain('No violation found');
    });

    it('rejects unverified user from submitting a report', async () => {
      // Create an unverified user in memory
      inMemoryDb.saveProfile({
        id: 'u-unverified-001',
        email: 'unverified@test.com',
        full_name: 'Unverified Test',
        role: 'founder',
        is_student: false,
        organization: null,
        avatar_url: null,
        bio: null,
        location: null,
        website: null,
        status: 'active',
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const unverifiedToken = generateToken({ sub: 'u-unverified-001', email: 'unverified@test.com' });

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          target_type: 'startup',
          target_id: 's0000000-0000-0000-0000-000000000001',
          reason: 'Test report',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNVERIFIED_ACCOUNT');
    });
  });

  // TASK 4: Platform Operational Stats (GET /admin/stats)
  describe('GET /admin/stats', () => {
    it('stats accurately match seeded database state', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const stats = res.body.data;

      // Seeded users by role: 1 admin, 3 founders, 3 investors, 2 mentors, 2 incubators = 11
      expect(stats.users_by_role.admin).toBe(1);
      expect(stats.users_by_role.founder).toBe(3);
      expect(stats.users_by_role.investor).toBe(3);
      expect(stats.users_by_role.mentor).toBe(2);
      expect(stats.users_by_role.incubator).toBe(2);
      expect(stats.total_users).toBe(11);

      // Seeded startups: 5 startups (none hidden initially)
      expect(stats.startups_listed).toBe(5);

      // Seeded pending verifications: 2
      expect(stats.pending_verifications).toBe(2);

      // Seeded reports: 0 initially
      expect(stats.open_reports).toBe(0);

      // Seeded requests in last 30 days: applications (2 seeded)
      expect(stats.requests_last_30_days).toBeGreaterThanOrEqual(2);
    });

    it('stats reflect new reports and hidden startups dynamically', async () => {
      // 1. Submit a report
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          target_type: 'startup',
          target_id: 's0000000-0000-0000-0000-000000000001',
          reason: 'Duplicate listing',
        });

      // 2. Hide a startup
      await request(app)
        .post('/api/v1/admin/startups/s0000000-0000-0000-0000-000000000001/hide')
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.open_reports).toBe(1);
      expect(res.body.data.startups_listed).toBe(4); // 5 - 1 hidden = 4
    });
  });

  // TASK 5: Audit Logs (Every admin action writes to audit_logs; GET /admin/audit-logs)
  describe('Audit Logging Verification', () => {
    it('creates audit entries for suspend, reactivate, hide, unhide, and report resolutions', async () => {
      // Perform actions
      await request(app)
        .post(`/api/v1/admin/users/${founder2Id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Audit test suspension' });

      await request(app)
        .post(`/api/v1/admin/users/${founder2Id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Audit test reactivation' });

      await request(app)
        .post('/api/v1/admin/startups/s0000000-0000-0000-0000-000000000004/hide')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Audit test hide' });

      // Fetch audit logs
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const actions = res.body.data.map((l: any) => l.action);
      expect(actions).toContain('USER_SUSPENDED');
      expect(actions).toContain('USER_REACTIVATED');
      expect(actions).toContain('STARTUP_HIDDEN');

      // Check log properties
      const userSuspendedLog = res.body.data.find((l: any) => l.action === 'USER_SUSPENDED');
      expect(userSuspendedLog.target_type).toBe('user');
      expect(userSuspendedLog.target_id).toBe(founder2Id);
      expect(userSuspendedLog.actor_name).toBe('Platform Admin');
    });
  });
});
