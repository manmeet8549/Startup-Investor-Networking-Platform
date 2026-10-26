import { Router } from 'express';
import * as startupService from '../services/startup.service.js';

export const metaRouter = Router();

// 1. GET /meta/sectors - Filter options for sectors with counts
metaRouter.get('/meta/sectors', async (_req, res, next) => {
  try {
    const meta = await startupService.getFilterMetadata();
    res.status(200).json({
      data: meta.sectors,
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /meta/stages - Filter options for stages with counts
metaRouter.get('/meta/stages', async (_req, res, next) => {
  try {
    const meta = await startupService.getFilterMetadata();
    res.status(200).json({
      data: meta.stages,
    });
  } catch (error) {
    next(error);
  }
});

// 3. GET /meta/locations - Filter options for locations with counts
metaRouter.get('/meta/locations', async (_req, res, next) => {
  try {
    const meta = await startupService.getFilterMetadata();
    res.status(200).json({
      data: meta.locations,
    });
  } catch (error) {
    next(error);
  }
});
