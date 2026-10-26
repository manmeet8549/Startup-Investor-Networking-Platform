import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
      service: 'founders-den-backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});
