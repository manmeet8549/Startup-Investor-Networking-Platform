import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { inMemoryDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';

describe('Auth & Profile API', () => {
  beforeEach(() => {
    inMemoryDb.reset();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('registers a founder with student innovator flag set to true', async () => {
      const payload = {
        email: 'student.founder@example.com',
        password: 'Password123!',
        full_name: 'Simran Kaur',
        role: 'founder',
        is_student: true,
        organization: 'GreenTech Student Lab',
        bio: 'Working on circular waste solutions.',
        location: 'Patiala, India',
      };

      const res = await request(app).post('/api/v1/auth/signup').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(payload.email);
      expect(res.body.data.user.role).toBe('founder');
      expect(res.body.data.user.is_student).toBe(true);
      expect(res.body.data.user.verification_status).toBe('verified');
    });

    it('registers an investor with verification_status pending and adds to verification queue', async () => {
      const payload = {
        email: 'partner@horizonvc.example.com',
        password: 'Password123!',
        full_name: 'Horizon Capital',
        role: 'investor',
        organization: 'Horizon VC Partners',
        bio: 'Early stage climate fund',
        location: 'Mumbai, India',
      };

      const res = await request(app).post('/api/v1/auth/signup').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('investor');
      expect(res.body.data.user.verification_status).toBe('pending');

      // Verify item entered verification queue
      const queue = inMemoryDb.listVerificationRequests({ page: 1, limit: 10, status: 'pending' });
      const found = queue.requests.find((r) => r.user_id === res.body.data.user.id);
      expect(found).toBeDefined();
      expect(found?.role_requested).toBe('investor');
    });

    it('rejects duplicate email with 409 EMAIL_EXISTS', async () => {
      const payload = {
        email: 'manmeet@foundersden.test',
        password: 'Password123!',
        full_name: 'Duplicate Test',
        role: 'founder',
      };

      const res = await request(app).post('/api/v1/auth/signup').send(payload);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('rejects invalid email and weak password with 422 VALIDATION_ERROR', async () => {
      const payload = {
        email: 'not-an-email',
        password: '123',
        full_name: '',
      };

      const res = await request(app).post('/api/v1/auth/signup').send(payload);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates seeded user and returns JWT token', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'manmeet@foundersden.test',
        password: 'any-valid-input-for-seed',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('manmeet@foundersden.test');
      expect(res.body.data.user.role).toBe('founder');
      expect(res.body.data).toHaveProperty('token');
    });

    it('rejects unknown user with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'unknown@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('fetches authenticated profile from DB using bearer token', async () => {
      const token = generateToken({
        sub: 'f0000000-0000-0000-0000-000000000001',
        email: 'manmeet@foundersden.test',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('f0000000-0000-0000-0000-000000000001');
      expect(res.body.data.full_name).toBe('Manmeet Singh');
      expect(res.body.data.role).toBe('founder');
      expect(res.body.data.is_student).toBe(true);
    });

    it('rejects without Authorization header with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects forged role in token because role is read directly from DB', async () => {
      // Craft a token claiming to be admin, but with founder's user ID
      const forgedToken = generateToken({
        sub: 'f0000000-0000-0000-0000-000000000001',
        email: 'manmeet@foundersden.test',
        role: 'admin',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(200);
      // Must be founder as in the DB, ignoring the token's claim!
      expect(res.body.data.role).toBe('founder');
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('updates allowed profile fields', async () => {
      const token = generateToken({
        sub: 'f0000000-0000-0000-0000-000000000001',
        email: 'manmeet@foundersden.test',
      });

      const res = await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Updated bio for FarmSense founder.',
          location: 'Chandigarh, India',
          is_student: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('Updated bio for FarmSense founder.');
      expect(res.body.data.location).toBe('Chandigarh, India');
    });
  });
});
