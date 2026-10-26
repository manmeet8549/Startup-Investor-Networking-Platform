import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';

describe('Admin User & Verification API', () => {
  const adminToken = generateToken({
    sub: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@foundersden.test',
  });

  const founderToken = generateToken({
    sub: 'f0000000-0000-0000-0000-000000000001',
    email: 'manmeet@foundersden.test',
  });

  beforeEach(() => {
    inMemoryDb.reset();
  });

  describe('RBAC Authorization Guard', () => {
    it('denies access to non-admin users with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('grants access to admin users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('supports pagination with page and limit parameters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
    });

    it('filters users by role and search string', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?role=investor')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((u: any) => u.role === 'investor')).toBe(true);
    });
  });

  describe('PATCH /api/v1/admin/users/:id/status', () => {
    it('suspends a user and subsequently blocks them from auth endpoints', async () => {
      const targetUserId = 'f0000000-0000-0000-0000-000000000002'; // Riya Kapoor

      const suspendRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe('suspended');

      // Now attempt to access /api/v1/auth/me as suspended user
      const riyaToken = generateToken({
        sub: targetUserId,
        email: 'riya@foundersden.test',
      });

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${riyaToken}`);

      expect(meRes.status).toBe(403);
      expect(meRes.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Verification Queue & Approval', () => {
    it('lists pending verification requests', async () => {
      const res = await request(app)
        .get('/api/v1/admin/verifications?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('approves a verification request and updates user profile to verified', async () => {
      const requestId = 'e0000000-0000-0000-0000-000000000001'; // Northstar Ventures
      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'verified',
          admin_notes: 'Verified registered investment fund.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.request.status).toBe('verified');
      expect(res.body.data.user.verification_status).toBe('verified');

      // Check DB directly
      const profile = inMemoryDb.getProfileById('i0000000-0000-0000-0000-000000000001');
      expect(profile?.verification_status).toBe('verified');
    });

    it('rejects a verification request with admin notes', async () => {
      const requestId = 'e0000000-0000-0000-0000-000000000002'; // Dr. Kavita Mehra
      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          admin_notes: 'Missing required credentials.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.request.status).toBe('rejected');
      expect(res.body.data.user.verification_status).toBe('rejected');
    });
  });
});
