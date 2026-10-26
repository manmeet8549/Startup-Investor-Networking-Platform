import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { updateProfileSchema } from '../schemas/auth.schema.js';
import {
  founderProfileUpdateSchema,
  investorProfileUpdateSchema,
  mentorProfileUpdateSchema,
  incubatorProfileUpdateSchema,
} from '../schemas/role-profile.schema.js';
import * as profileService from '../services/profile.service.js';
import * as roleProfileService from '../services/role-profile.service.js';
import * as startupService from '../services/startup.service.js';

export const meRouter = Router();

// All /me endpoints require authentication
meRouter.use('/me', authenticate);

// GET /me - returns current authenticated user's profile
meRouter.get('/me', async (req, res, next) => {
  try {
    res.status(200).json({
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /me - updates current user's profile (role escalation prevented)
meRouter.patch('/me', validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const updated = await profileService.updateProfile(req.user!.id, req.body);
    res.status(200).json({
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET & PUT /me/founder-profile
meRouter.get('/me/founder-profile', async (req, res, next) => {
  try {
    const profile = await roleProfileService.getFounderProfile(req.user!.id);
    res.status(200).json({
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

meRouter.put('/me/founder-profile', validateBody(founderProfileUpdateSchema), async (req, res, next) => {
  try {
    const updated = await roleProfileService.putFounderProfile(req.user!.id, req.body);
    res.status(200).json({
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET & PUT /me/investor-profile
meRouter.get('/me/investor-profile', async (req, res, next) => {
  try {
    const profile = await roleProfileService.getInvestorProfile(req.user!.id);
    res.status(200).json({
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

meRouter.put('/me/investor-profile', validateBody(investorProfileUpdateSchema), async (req, res, next) => {
  try {
    const updated = await roleProfileService.putInvestorProfile(req.user!.id, req.body);
    res.status(200).json({
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET & PUT /me/mentor-profile
meRouter.get('/me/mentor-profile', async (req, res, next) => {
  try {
    const profile = await roleProfileService.getMentorProfile(req.user!.id);
    res.status(200).json({
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

meRouter.put('/me/mentor-profile', validateBody(mentorProfileUpdateSchema), async (req, res, next) => {
  try {
    const updated = await roleProfileService.putMentorProfile(req.user!.id, req.body);
    res.status(200).json({
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET & PUT /me/incubator-profile
meRouter.get('/me/incubator-profile', async (req, res, next) => {
  try {
    const profile = await roleProfileService.getIncubatorProfile(req.user!.id);
    res.status(200).json({
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

meRouter.put('/me/incubator-profile', validateBody(incubatorProfileUpdateSchema), async (req, res, next) => {
  try {
    const updated = await roleProfileService.putIncubatorProfile(req.user!.id, req.body);
    res.status(200).json({
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET /me/startups - List all startups belonging to the authenticated founder
meRouter.get('/me/startups', async (req, res, next) => {
  try {
    const startups = await startupService.listMyStartups(req.user!.id);
    res.status(200).json({
      data: startups,
    });
  } catch (error) {
    next(error);
  }
});

