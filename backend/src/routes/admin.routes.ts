import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { uuidParamSchema } from '../schemas/common.schema.js';
import {
  listUsersQuerySchema,
  updateUserStatusSchema,
  suspendUserSchema,
  reactivateUserSchema,
  listAdminStartupsQuerySchema,
  hideStartupSchema,
  listReportsQuerySchema,
  resolveReportSchema,
  dismissReportSchema,
  reviewReportSchema,
  listAuditLogsQuerySchema,
  listVerificationsQuerySchema,
  reviewVerificationSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
} from '../schemas/admin.schema.js';
import * as adminService from '../services/admin.service.js';
import * as reportService from '../services/report.service.js';

export const adminRouter = Router();

// All admin routes require authenticated session with 'admin' role (enforced strictly from DB)
adminRouter.use(authenticate, requireRole('admin'));

// 1. GET /admin/users - List users with filters (role, status, search, pagination)
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

// 2. POST /admin/users/:id/suspend - Suspend user with reason
adminRouter.post(
  '/users/:id/suspend',
  validateParams(uuidParamSchema),
  validateBody(suspendUserSchema),
  async (req, res, next) => {
    try {
      const updated = await adminService.suspendUser(req.params.id, req.user!.id, req.body?.reason);
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 3. POST /admin/users/:id/reactivate - Reactivate suspended user with reason
adminRouter.post(
  '/users/:id/reactivate',
  validateParams(uuidParamSchema),
  validateBody(reactivateUserSchema),
  async (req, res, next) => {
    try {
      const updated = await adminService.reactivateUser(req.params.id, req.user!.id, req.body?.reason);
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 4. PATCH /admin/users/:id/status - Update user status, role, or verification_status
adminRouter.patch(
  '/users/:id/status',
  validateParams(uuidParamSchema),
  validateBody(updateUserStatusSchema),
  async (req, res, next) => {
    try {
      const updated = await adminService.updateUserStatus(req.params.id, req.body, req.user!.id);
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 5. GET /admin/startups - List all startups including hidden
adminRouter.get('/startups', validateQuery(listAdminStartupsQuerySchema), async (req, res, next) => {
  try {
    const result = await adminService.listAdminStartups(req.query as any);
    res.status(200).json({
      data: result.startups,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

// 6. POST /admin/startups/:id/hide - Hide startup from discovery
adminRouter.post(
  '/startups/:id/hide',
  validateParams(uuidParamSchema),
  validateBody(hideStartupSchema),
  async (req, res, next) => {
    try {
      const updated = await adminService.hideStartup(req.params.id, req.user!.id, req.body?.reason);
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 7. POST /admin/startups/:id/unhide - Unhide startup
adminRouter.post(
  '/startups/:id/unhide',
  validateParams(uuidParamSchema),
  async (req, res, next) => {
    try {
      const updated = await adminService.unhideStartup(req.params.id, req.user!.id);
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 8. DELETE /admin/startups/:id - Delete startup listing
adminRouter.delete(
  '/startups/:id',
  validateParams(uuidParamSchema),
  async (req, res, next) => {
    try {
      await adminService.deleteStartupByAdmin(req.params.id, req.user!.id);
      res.status(200).json({
        data: { message: 'Startup successfully deleted' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 9. GET /admin/reports - Admin lists all reports
adminRouter.get('/reports', validateQuery(listReportsQuerySchema), async (req, res, next) => {
  try {
    const result = await reportService.listReports(req.query as any);
    res.status(200).json({
      data: result.reports,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

// 10. POST /admin/reports/:id/resolve - Resolve report with note
adminRouter.post(
  '/reports/:id/resolve',
  validateParams(uuidParamSchema),
  validateBody(resolveReportSchema),
  async (req, res, next) => {
    try {
      const note = req.body?.resolution_notes || req.body?.note;
      const result = await reportService.resolveReport(req.params.id, req.user!.id, note);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 11. POST /admin/reports/:id/dismiss - Dismiss report with note
adminRouter.post(
  '/reports/:id/dismiss',
  validateParams(uuidParamSchema),
  validateBody(dismissReportSchema),
  async (req, res, next) => {
    try {
      const note = req.body?.resolution_notes || req.body?.note;
      const result = await reportService.dismissReport(req.params.id, req.user!.id, note);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 12. PATCH /admin/reports/:id - Update report status and resolution notes
adminRouter.patch(
  '/reports/:id',
  validateParams(uuidParamSchema),
  validateBody(reviewReportSchema),
  async (req, res, next) => {
    try {
      const result = await reportService.reviewReport(req.params.id, req.user!.id, req.body);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 13. GET /admin/stats - Platform operational statistics
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const stats = await adminService.getAdminStats();
    res.status(200).json({
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// 14. GET /admin/audit-logs - Query audit log history
adminRouter.get('/audit-logs', validateQuery(listAuditLogsQuerySchema), async (req, res, next) => {
  try {
    const result = await adminService.listAuditLogs(req.query as any);
    res.status(200).json({
      data: result.logs,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
});

// 15. GET /admin/verifications - List verification requests
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

// 16. POST /admin/verifications/:id/approve - Approve verification
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

// 17. POST /admin/verifications/:id/reject - Reject verification
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

// 18. PATCH /admin/verifications/:id - Review verification
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
