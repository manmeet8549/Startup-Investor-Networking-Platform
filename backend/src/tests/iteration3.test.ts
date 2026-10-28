import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { config } from '../config.js';

describe('Iteration 3: Authentication, roles and verification', () => {
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

  const adminToken = generateToken({
    sub: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@foundersden.test',
  });

  beforeEach(() => {
    inMemoryDb.reset();
  });

  describe('Task 2 & Tests: User Registration Per Role & Admin Rejection', () => {

    it('registers founder successfully and marks verified immediately', async () => {
      const res = await request(app).post('/api/v1/auth/register-profile').send({
        email: 'founder.new@test.com',
        full_name: 'John Founder',
        role: 'founder',
        is_student: false,
        organization: 'Alpha Startup',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.role).toBe('founder');
      expect(res.body.data.profile.verification_status).toBe('verified');
      expect(res.body.data.profile.status).toBe('active');
    });

    it('registers investor with pending verification', async () => {
      const res = await request(app).post('/api/v1/auth/register-profile').send({
        email: 'investor.new@test.com',
        full_name: 'Jane Investor',
        role: 'investor',
        organization: 'Ventures LLC',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.role).toBe('investor');
      expect(res.body.data.profile.verification_status).toBe('pending');
      expect(res.body.data.verification_request).toBeDefined();
      expect(res.body.data.verification_request.status).toBe('pending');
    });

    it('registers mentor with pending verification', async () => {
      const res = await request(app).post('/api/v1/auth/register-profile').send({
        email: 'mentor.new@test.com',
        full_name: 'Dr. Tech Mentor',
        role: 'mentor',
        organization: 'Tech Academy',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.role).toBe('mentor');
      expect(res.body.data.profile.verification_status).toBe('pending');
    });

    it('registers incubator with pending verification', async () => {
      const res = await request(app).post('/api/v1/auth/register-profile').send({
        email: 'incubator.new@test.com',
        full_name: 'Global Incubator',
        role: 'incubator',
        organization: 'Global Innovation Hub',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.profile.role).toBe('incubator');
      expect(res.body.data.profile.verification_status).toBe('pending');
    });

    it('explicitly rejects request to register with admin role', async () => {
      const res = await request(app).post('/api/v1/auth/register-profile').send({
        email: 'malicious.admin@test.com',
        full_name: 'Hacker',
        role: 'admin',
      });

      // Role enum or validation service will reject admin registration
      expect([403, 422]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Task 3: Profile and Role Profile Endpoints (/me and /me/*-profile)', () => {
    it('fetches /api/v1/me and updates profile via PATCH /api/v1/me', async () => {
      const token = generateToken({
        sub: 'f0000000-0000-0000-0000-000000000001',
        email: 'manmeet@foundersden.test',
      });

      const getRes = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe('f0000000-0000-0000-0000-000000000001');

      const patchRes = await request(app)
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Founder of FarmSense AI',
          location: 'Chandigarh, India',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.bio).toBe('Founder of FarmSense AI');
      expect(patchRes.body.data.location).toBe('Chandigarh, India');
    });

    it('blocks role escalation when user attempts to edit profile role', async () => {
      const token = generateToken({
        sub: 'f0000000-0000-0000-0000-000000000001',
        email: 'manmeet@foundersden.test',
      });

      // Attempt to escalate role to admin
      const res = await request(app)
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'admin',
          verification_status: 'verified',
        });

      expect(res.status).toBe(200);
      // Profile remains founder!
      expect(res.body.data.role).toBe('founder');

      const profileInDb = inMemoryDb.getProfileById('f0000000-0000-0000-0000-000000000001');
      expect(profileInDb?.role).toBe('founder');
    });

    it('gets and puts /me/founder-profile', async () => {
      const token = generateToken({
        sub: 'f0000000-0000-0000-0000-000000000001',
        email: 'manmeet@foundersden.test',
      });

      const getRes = await request(app)
        .get('/api/v1/me/founder-profile')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.user_id).toBe('f0000000-0000-0000-0000-000000000001');

      const putRes = await request(app)
        .put('/api/v1/me/founder-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Updated founder thesis',
          organization: 'FarmSense Labs',
          is_student: true,
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.bio).toBe('Updated founder thesis');
      expect(putRes.body.data.organization).toBe('FarmSense Labs');
    });

    it('gets and puts /me/investor-profile', async () => {
      const token = generateToken({
        sub: 'b0000000-0000-0000-0000-000000000001',
        email: 'investor@foundersden.test',
      });

      const getRes = await request(app)
        .get('/api/v1/me/investor-profile')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.user_id).toBe('b0000000-0000-0000-0000-000000000001');

      const putRes = await request(app)
        .put('/api/v1/me/investor-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          investment_thesis: 'Investing in AgTech and climate resiliency',
          ticket_size_min: 50000,
          ticket_size_max: 250000,
          preferred_sectors: ['Agritech', 'AI', 'Robotics'],
          preferred_stages: ['Pre-seed', 'Seed'],
          preferred_locations: ['India', 'Southeast Asia'],
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.investment_thesis).toBe('Investing in AgTech and climate resiliency');
      expect(putRes.body.data.ticket_size_max).toBe(250000);
      expect(putRes.body.data.preferred_sectors).toContain('Agritech');
    });

    it('gets and puts /me/mentor-profile', async () => {
      const token = generateToken({
        sub: 'd0000000-0000-0000-0000-000000000001',
        email: 'mentor@foundersden.test',
      });

      const getRes = await request(app)
        .get('/api/v1/me/mentor-profile')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);

      const putRes = await request(app)
        .put('/api/v1/me/mentor-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          expertise_areas: ['Product Architecture', 'Go To Market'],
          years_of_experience: 12,
          mentoring_topics: ['Fundraising Pitch', 'Scaling Engineering'],
          linkedin_url: 'https://linkedin.com/in/mentor-expert',
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.years_of_experience).toBe(12);
      expect(putRes.body.data.expertise_areas).toContain('Product Architecture');
    });

    it('gets and puts /me/incubator-profile', async () => {
      const token = generateToken({
        sub: 'c0000000-0000-0000-0000-000000000001',
        email: 'punjab@foundersden.test',
      });

      const getRes = await request(app)
        .get('/api/v1/me/incubator-profile')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);

      const putRes = await request(app)
        .put('/api/v1/me/incubator-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          organization_name: 'Nexus Innovation Accelerators',
          website: 'https://nexus-accelerator.example.com',
          program_types: ['Seed Accelerator', 'Co-working', 'Mentorship'],
          cohort_size: 25,
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.organization_name).toBe('Nexus Innovation Accelerators');
      expect(putRes.body.data.cohort_size).toBe(25);
    });
  });

  describe('Task 4 & Tests: Verification Flow, Admin Approval, and Audit Logging', () => {
    it('pending investor receives 403 UNVERIFIED_ACCOUNT and succeeds after admin approval', async () => {
      // 1. Register new investor (starts as pending)
      const regRes = await request(app).post('/api/v1/auth/register-profile').send({
        email: 'angel.investor@fund.test',
        full_name: 'Angel Investor',
        role: 'investor',
        organization: 'Seed Angel Network',
      });

      expect(regRes.status).toBe(201);
      const investorId = regRes.body.data.profile.id;
      const verificationRequestId = regRes.body.data.verification_request.id;

      const investorToken = generateToken({
        sub: investorId,
        email: 'angel.investor@fund.test',
      });

      // 2. Pending investor attempts to access verified-only dealflow endpoint -> receives 403
      const pendingAccessRes = await request(app)
        .get('/api/v1/deals/verified-feed')
        .set('Authorization', `Bearer ${investorToken}`);

      expect(pendingAccessRes.status).toBe(403);
      expect(pendingAccessRes.body.error.code).toBe('UNVERIFIED_ACCOUNT');

      // 3. Admin lists verification requests filtered by role and status
      const listRes = await request(app)
        .get('/api/v1/admin/verifications?role=investor&status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const foundInQueue = listRes.body.data.find((v: any) => v.id === verificationRequestId);
      expect(foundInQueue).toBeDefined();

      // 4. Admin approves investor verification
      const approveRes = await request(app)
        .post(`/api/v1/admin/verifications/${verificationRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Verified accreditation and portfolio via registry check.' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.request.status).toBe('verified');
      expect(approveRes.body.data.user.verification_status).toBe('verified');

      // 5. Verify action is written to audit_logs
      const auditLogs = inMemoryDb.listAuditLogs();
      const approvedLog = auditLogs.find(
        (l) => l.action === 'VERIFICATION_APPROVED' && l.target_id === verificationRequestId
      );
      expect(approvedLog).toBeDefined();
      expect(approvedLog?.admin_id).toBe('a0000000-0000-0000-0000-000000000001');

      // 6. Now verified investor accesses verified-only dealflow -> succeeds with 200!
      const verifiedAccessRes = await request(app)
        .get('/api/v1/deals/verified-feed')
        .set('Authorization', `Bearer ${investorToken}`);

      expect(verifiedAccessRes.status).toBe(200);
      expect(verifiedAccessRes.body.data.message).toBe('Access granted to verified investor dealflow');
    });

    it('admin can reject verification with mandatory reason and writes to audit_logs', async () => {
      // 1. Register a mentor
      const regRes = await request(app).post('/api/v1/auth/register-profile').send({
        email: 'applicant.mentor@test.com',
        full_name: 'Unqualified Applicant',
        role: 'mentor',
      });
      const requestId = regRes.body.data.verification_request.id;

      // 2. Reject without reason -> validation error 422
      const invalidReject = await request(app)
        .post(`/api/v1/admin/verifications/${requestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(invalidReject.status).toBe(422);

      // 3. Reject with reason -> succeeds
      const rejectRes = await request(app)
        .post(`/api/v1/admin/verifications/${requestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Insufficient verifiable experience in tech domain.' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.request.status).toBe('rejected');
      expect(rejectRes.body.data.user.verification_status).toBe('rejected');

      // 4. Verify audit log entry
      const auditLogs = inMemoryDb.listAuditLogs();
      const rejectedLog = auditLogs.find(
        (l) => l.action === 'VERIFICATION_REJECTED' && l.target_id === requestId
      );
      expect(rejectedLog).toBeDefined();
      expect(rejectedLog?.details).toMatchObject({
        reason: 'Insufficient verifiable experience in tech domain.',
      });
    });
  });

  describe('Security Tests: Invalid, Expired, Tampered Tokens & Suspended Users', () => {
    it('returns 401 UNAUTHORIZED for missing authorization token', async () => {
      const res = await request(app).get('/api/v1/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED for tampered token signature', async () => {
      const token = jwt.sign(
        { sub: 'f0000000-0000-0000-0000-000000000001', email: 'manmeet@foundersden.test' },
        'wrong-secret-key'
      );

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 TOKEN_EXPIRED for expired token', async () => {
      // Craft expired token (expired 10 seconds ago)
      const expiredToken = jwt.sign(
        {
          sub: 'f0000000-0000-0000-0000-000000000001',
          email: 'manmeet@foundersden.test',
          exp: Math.floor(Date.now() / 1000) - 10,
        },
        config.SUPABASE_JWT_SECRET
      );

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('blocks suspended users with 403 ACCOUNT_SUSPENDED', async () => {
      // Suspend user
      const user = inMemoryDb.getProfileById('f0000000-0000-0000-0000-000000000001');
      if (user) {
        inMemoryDb.saveProfile({ ...user, status: 'suspended' });
      }

      const token = generateToken({
        sub: 'f0000000-0000-0000-0000-000000000001',
        email: 'manmeet@foundersden.test',
      });

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });
});
