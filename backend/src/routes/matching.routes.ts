import { Router, type Request, type Response, type NextFunction } from 'express';
import { matchingService } from '../services/matching.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, requireVerified } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  matchInvestorsQuerySchema,
  matchStartupsQuerySchema,
  investorPreferencesSchema,
} from '../schemas/matching.schema.js';

export const matchingRouter = Router();

/**
 * GET /matches/investors?startup_id=
 * Founder gets ranked verified investors for a specific startup.
 */
matchingRouter.get(
  '/investors',
  authenticate,
  requireVerified,
  validateQuery(matchInvestorsQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startupId = req.query.startup_id as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await matchingService.matchInvestorsForStartup(
        startupId,
        req.user,
        page,
        limit
      );

      res.status(200).json({
        data: result.data,
        meta: result.meta,
        disclaimer: result.disclaimer,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /matches/startups
 * Investor gets ranked listed startups matching their thesis and preferences.
 */
matchingRouter.get(
  '/startups',
  authenticate,
  requireRole('investor', 'admin'),
  requireVerified,
  validateQuery(matchStartupsQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await matchingService.matchStartupsForInvestor(
        req.user!.id,
        req.user,
        page,
        limit
      );

      res.status(200).json({
        data: result.data,
        meta: result.meta,
        disclaimer: result.disclaimer,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const investorRouter = Router();

/**
 * GET /investors/preferences
 * Returns the authenticated investor's investment preferences.
 */
investorRouter.get(
  '/preferences',
  authenticate,
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prefs = await matchingService.getInvestorPreferences(req.user!.id);
      res.status(200).json({ data: prefs });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /investors/preferences
 * Updates the authenticated investor's preferences and invalidates cached matches.
 */
investorRouter.put(
  '/preferences',
  authenticate,
  requireRole('investor', 'admin'),
  validateBody(investorPreferencesSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await matchingService.updateInvestorPreferences(
        req.user!.id,
        req.body
      );
      res.status(200).json({
        data: updated,
        message: 'Investor preferences updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);
