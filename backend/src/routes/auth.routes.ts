import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware.js';
import { registerSchema, registerProfileSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';
import * as profileService from '../services/profile.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

import { authLimiter } from '../middleware/rate-limit.middleware.js';

export const authRouter = Router();
authRouter.use('/auth', authLimiter);

authRouter.post('/auth/register-profile', validateBody(registerProfileSchema), async (req, res, next) => {
  try {
    const result = await authService.registerProfile(req.body);
    res.status(201).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/signup', validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/auth/me', authenticate, async (req, res, next) => {
  try {
    // req.user has been verified and fetched directly from DB
    res.status(200).json({
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.patch('/auth/me', authenticate, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const updated = await profileService.updateProfile(req.user!.id, req.body);
    res.status(200).json({
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});
