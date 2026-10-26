import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, requireVerified } from '../middleware/rbac.middleware.js';

export const dealRouter = Router();

/**
 * Verified-only endpoint for investors & admins to access curated dealflow.
 * Pending or rejected users will receive 403 Forbidden.
 */
dealRouter.get(
  '/deals/verified-feed',
  authenticate,
  requireRole('investor', 'admin'),
  requireVerified,
  (req, res) => {
    res.status(200).json({
      data: {
        message: 'Access granted to verified investor dealflow',
        deals: [
          {
            id: 'deal-101',
            startup_name: 'Apex Robotics',
            sector: 'Robotics',
            ask: 500000,
            stage: 'Seed',
          },
        ],
      },
    });
  }
);
