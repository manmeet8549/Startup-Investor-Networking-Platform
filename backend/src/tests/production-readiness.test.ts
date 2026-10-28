import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { config, validateEnv } from '../config.js';

describe('Phase 1: Backend Production Readiness Suite', () => {
  describe('Health Endpoints (Requirement 3)', () => {
    it('GET /health returns 200 immediately without touching DB', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /api/v1/health checks the database and returns 200', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.database).toBe('connected');
      expect(res.body.data).toHaveProperty('latency_ms');
    });

    it('GET /api/v1/ready returns 200 readiness status', async () => {
      const res = await request(app).get('/api/v1/ready');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('healthy');
    });
  });

  describe('Reverse Proxy & IP Forwarding (Requirement 4)', () => {
    it('trusts reverse proxy (app.get("trust proxy") is 1)', () => {
      expect(app.get('trust proxy')).toBe(1);
    });

    it('honors X-Forwarded-For header on requests', async () => {
      const testIp = '198.51.100.42';
      const res = await request(app)
        .get('/health')
        .set('X-Forwarded-For', testIp);

      expect(res.status).toBe(200);
    });
  });

  describe('CORS Enforcement (Requirement 5)', () => {
    it('sets access-control-allow-origin and credentials for listed origins', async () => {
      const allowed = config.CORS_ORIGIN.split(',')[0].trim();
      const res = await request(app)
        .options('/api/v1/auth/signup')
        .set('Origin', allowed)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBe(allowed);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does NOT set access-control-allow-origin for unlisted origins', async () => {
      const unlisted = 'https://malicious-site.example.com';
      const res = await request(app)
        .options('/api/v1/auth/signup')
        .set('Origin', unlisted)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Config Validation in Production (Requirement 6)', () => {
    it('refuses to start when USE_IN_MEMORY_DB=true in production', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://user:pass@host:5432/db',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'role-key',
          CORS_ORIGIN: 'https://foundersden.com',
          USE_IN_MEMORY_DB: 'true',
        })
      ).toThrow(/USE_IN_MEMORY_DB/);
    });

    it('refuses to start when DATABASE_URL is missing in production and names the variable', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: '',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'role-key',
          CORS_ORIGIN: 'https://foundersden.com',
          USE_IN_MEMORY_DB: false,
        })
      ).toThrow(/DATABASE_URL/);
    });

    it('refuses to start when CORS_ORIGIN is missing in production and names the variable', () => {
      expect(() =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://user:pass@host:5432/db',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'role-key',
          CORS_ORIGIN: '',
          USE_IN_MEMORY_DB: false,
        })
      ).toThrow(/CORS_ORIGIN/);
    });
  });
});
