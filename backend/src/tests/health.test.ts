import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import * as dbPool from '../db/pool.js';
import { validateEnv } from '../config.js';

describe('Iteration 1: Health, Environment & Middleware Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbPool, 'checkDatabaseConnection').mockResolvedValue({
      ok: true,
      latencyMs: 5,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with status healthy and database connected when DB is ok', async () => {
      vi.spyOn(dbPool, 'checkDatabaseConnection').mockResolvedValue({
        ok: true,
        latencyMs: 14,
      });

      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.database).toBe('connected');
      expect(res.body.data.latency_ms).toBe(14);
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('timestamp');
    });

    it('returns 503 SERVICE_UNAVAILABLE when database is unreachable', async () => {
      vi.spyOn(dbPool, 'checkDatabaseConnection').mockResolvedValue({
        ok: false,
        latencyMs: 50,
        error: 'Database connection failed: password authentication failed',
      });

      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(503);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.error.message).toBe('Database is unreachable');
      expect(res.body.error.details.database).toBe('unhealthy');
      expect(res.body.error.details.error).toContain('password authentication failed');
    });
  });

  describe('Environment Validation (Fail Fast)', () => {
    it('stops the app with a clear message when a required env var is missing', () => {
      const incompleteEnv = {
        PORT: '5000',
        SUPABASE_URL: 'https://fqbixskkrtlbvplchjjp.supabase.co',
        // DATABASE_URL and SUPABASE_ANON_KEY are missing
      };

      expect(() => validateEnv(incompleteEnv)).toThrowError(/Environment validation failed:/);
      expect(() => validateEnv(incompleteEnv)).toThrowError(/DATABASE_URL is required/);
      expect(() => validateEnv(incompleteEnv)).toThrowError(/SUPABASE_ANON_KEY is required/);
    });

    it('validates a complete environment correctly', () => {
      const validEnv = {
        PORT: '5000',
        CORS_ORIGIN: 'http://localhost:3000',
        SUPABASE_URL: 'https://fqbixskkrtlbvplchjjp.supabase.co',
        SUPABASE_ANON_KEY: 'valid-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'valid-service-role-key',
        DATABASE_URL: 'postgresql://postgres:pwd@db.example.com:5432/postgres?sslmode=require',
      };

      const parsed = validateEnv(validEnv);
      expect(parsed.PORT).toBe(5000);
      expect(parsed.SUPABASE_URL).toBe('https://fqbixskkrtlbvplchjjp.supabase.co');
      expect(parsed.DATABASE_URL).toContain('postgresql://');
    });
  });

  describe('Standard Error Shapes & Middleware', () => {
    it('returns the standard 404 error shape for an unknown route', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Cannot GET /api/v1/non-existent-endpoint',
        },
      });
    });

    it('returns 400 with standard error shape when request body has malformed JSON', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid-json-payload ');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Malformed JSON payload');
    });

    it('includes Helmet security headers in responses', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      expect(res.headers).toHaveProperty('x-frame-options');
    });
  });
});
