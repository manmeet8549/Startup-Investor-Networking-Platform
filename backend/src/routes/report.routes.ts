import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createReportSchema } from '../schemas/admin.schema.js';
import * as reportService from '../services/report.service.js';

export const reportRouter = Router();

// POST /reports - Any verified user can submit a report against a startup, user, document, etc.
reportRouter.post(
  '/reports',
  authenticate,
  requireVerified,
  validateBody(createReportSchema),
  async (req, res, next) => {
    try {
      const report = await reportService.createReport(req.user!.id, req.body);
      res.status(201).json({
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);
