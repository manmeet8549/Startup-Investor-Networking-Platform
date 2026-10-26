import { Router } from 'express';
import { checkDatabaseConnection } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseConnection();

  if (!dbHealth.ok) {
    res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is unreachable',
        details: {
          database: 'unhealthy',
          error: dbHealth.error,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      },
    });
    return;
  }

  res.status(200).json({
    data: {
      status: 'healthy',
      database: 'connected',
      latency_ms: dbHealth.latencyMs,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});
