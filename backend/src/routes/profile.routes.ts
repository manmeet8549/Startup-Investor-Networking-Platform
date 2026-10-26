import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateParams } from '../middleware/validate.middleware.js';
import { uuidParamSchema } from '../schemas/common.schema.js';
import * as profileService from '../services/profile.service.js';

export const profileRouter = Router();

profileRouter.get('/profiles/:id', authenticate, validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.params.id);
    res.status(200).json({
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});
