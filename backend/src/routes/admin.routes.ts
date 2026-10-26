import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { uuidParamSchema } from '../schemas/common.schema.js';
import {
  listUsersQuerySchema,
  updateUserStatusSchema,
  listVerificationsQuerySchema,
  reviewVerificationSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
} from '../schemas/admin.schema.js';
import * as adminService from '../services/admin.service.js';

export const adminRouter = Router();

// All admin routes require authenticated session with 'admin' role (enforced strictly from DB)
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.get('/users', validateQuery(listUsersQuerySchema), async (req, res, next) => {
  try {
    const result = await adminService.listUsers(req.query as any);
    res.status(200).json({
      data: result.users,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch(
  '/users/:id/status',
  validateParams(uuidParamSchema),
  validateBody(updateUserStatusSchema),
  async (req, res, next) => {
    try {
      const updated = await adminService.updateUserStatus(req.params.id, req.body);
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.get('/verifications', validateQuery(listVerificationsQuerySchema), async (req, res, next) => {
  try {
    const result = await adminService.listVerificationRequests(req.query as any);
    res.status(200).json({
      data: result.requests,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post(
  '/verifications/:id/approve',
  validateParams(uuidParamSchema),
  validateBody(approveVerificationSchema),
  async (req, res, next) => {
    try {
      const result = await adminService.approveVerification(
        req.params.id,
        req.user!.id,
        req.body?.notes
      );
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  '/verifications/:id/reject',
  validateParams(uuidParamSchema),
  validateBody(rejectVerificationSchema),
  async (req, res, next) => {
    try {
      const result = await adminService.rejectVerification(
        req.params.id,
        req.user!.id,
        req.body.reason
      );
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.patch(
  '/verifications/:id',
  validateParams(uuidParamSchema),
  validateBody(reviewVerificationSchema),
  async (req, res, next) => {
    try {
      const result = await adminService.reviewVerification(req.params.id, req.user!.id, req.body);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);
