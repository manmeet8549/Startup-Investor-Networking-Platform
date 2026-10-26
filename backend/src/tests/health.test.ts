import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Health Check API', () => {
  it('GET /api/v1/health should return 200 with service status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('founders-den-backend');
    expect(res.body.data.version).toBe('1.0.0');
  });

  it('GET /unknown-route should return 404 in standard error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
