import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  mentorshipService,
  incubatorService,
  applicationService,
  notificationRetrievalService,
} from '../services/mentorship-incubation.service.js';
import {
  createMentorshipRequestSchema,
  respondMentorshipRequestSchema,
  createMentorFeedbackSchema,
  createProgramSchema,
  updateProgramSchema,
  applyProgramSchema,
  updateApplicationStatusSchema,
} from '../schemas/mentorship-incubation.schema.js';

export const mentorshipIncubationRouter = Router();

// ==========================================
// 1. MENTORS & MENTORSHIP REQUESTS
// ==========================================

// GET /mentors - Public listing with expertise filter
mentorshipIncubationRouter.get(
  '/mentors',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expertise = req.query.expertise as string | undefined;
      const mentors = await mentorshipService.listMentors(expertise);
      res.status(200).json({
        data: mentors,
        meta: { total: mentors.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /mentors/:id - Mentor profile details
mentorshipIncubationRouter.get(
  '/mentors/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mentor = await mentorshipService.getMentorById(req.params.id);
      res.status(200).json({ data: mentor });
    } catch (err) {
      next(err);
    }
  }
);

// POST /mentorship-requests - Founders request mentorship
mentorshipIncubationRouter.post(
  '/mentorship-requests',
  authenticate,
  requireRole('founder', 'admin'),
  validateBody(createMentorshipRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const founderId = req.user!.id;
      const created = await mentorshipService.createMentorshipRequest(founderId, req.body);
      res.status(201).json({
        data: created,
        message: 'Mentorship request submitted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /mentorship-requests - List requests for current user (mentor or founder)
mentorshipIncubationRouter.get(
  '/mentorship-requests',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      let filter: { mentorId?: string; founderId?: string } = {};

      if (userRole === 'mentor') {
        filter = { mentorId: userId };
      } else if (userRole === 'founder') {
        filter = { founderId: userId };
      }

      const requests = await mentorshipService.listMentorshipRequests(filter);
      res.status(200).json({
        data: requests,
        meta: { total: requests.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /mentorship-requests/:id/respond - Mentors accept or decline
mentorshipIncubationRouter.patch(
  '/mentorship-requests/:id/respond',
  authenticate,
  requireRole('mentor', 'admin'),
  validateBody(respondMentorshipRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mentorId = req.user!.id;
      const rawAction = req.body.action || req.body.status || 'decline';
      const action = rawAction.toLowerCase().startsWith('accept') || rawAction.toLowerCase().startsWith('approve') ? 'accept' : 'decline';
      const updated = await mentorshipService.respondToMentorshipRequest(
        mentorId,
        req.params.id,
        action,
        req.body.response_note
      );
      res.status(200).json({
        data: updated,
        message: `Mentorship request ${action === 'accept' ? 'accepted' : 'declined'}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /startups/:id/feedback - Mentors give feedback & rating
mentorshipIncubationRouter.post(
  '/startups/:id/feedback',
  authenticate,
  requireRole('mentor', 'admin'),
  validateBody(createMentorFeedbackSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mentorId = req.user!.id;
      const startupId = req.params.id;
      const created = await mentorshipService.createStartupFeedback(
        mentorId,
        startupId,
        req.body
      );
      res.status(201).json({
        data: created,
        message: 'Feedback submitted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /startups/:id/feedback - View feedback for startup
mentorshipIncubationRouter.get(
  '/startups/:id/feedback',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const feedbacks = await mentorshipService.listStartupFeedback(req.params.id);
      res.status(200).json({ data: feedbacks });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 2. INCUBATOR PROGRAMS (CRUD)
// ==========================================

// POST /programs - Incubator creates program
mentorshipIncubationRouter.post(
  '/programs',
  authenticate,
  requireRole('incubator', 'admin'),
  validateBody(createProgramSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incubatorId = req.user!.id;
      const program = await incubatorService.createProgram(incubatorId, req.body);
      res.status(201).json({
        data: program,
        message: 'Program created successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /programs - Public list with filters
mentorshipIncubationRouter.get(
  '/programs',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sector = req.query.sector as string | undefined;
      const stage = req.query.stage as string | undefined;
      const incubatorId = req.query.incubator_id as string | undefined;
      const programs = await incubatorService.listPrograms({
        sector,
        stage,
        incubatorId,
      });
      res.status(200).json({
        data: programs,
        meta: { total: programs.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /programs/:id - Public program detail
mentorshipIncubationRouter.get(
  '/programs/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await incubatorService.getProgramById(req.params.id);
      res.status(200).json({ data: program });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /programs/:id & PATCH /programs/:id - Update program
const handleUpdateProgram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incubatorId = req.user!.id;
    const userRole = req.user!.role;
    const updated = await incubatorService.updateProgram(
      incubatorId,
      req.params.id,
      req.body,
      userRole
    );
    res.status(200).json({
      data: updated,
      message: 'Program updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

mentorshipIncubationRouter.put(
  '/programs/:id',
  authenticate,
  requireRole('incubator', 'admin'),
  validateBody(updateProgramSchema),
  handleUpdateProgram
);

mentorshipIncubationRouter.patch(
  '/programs/:id',
  authenticate,
  requireRole('incubator', 'admin'),
  validateBody(updateProgramSchema),
  handleUpdateProgram
);

// DELETE /programs/:id - Delete program
mentorshipIncubationRouter.delete(
  '/programs/:id',
  authenticate,
  requireRole('incubator', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incubatorId = req.user!.id;
      const userRole = req.user!.role;
      const result = await incubatorService.deleteProgram(incubatorId, req.params.id, userRole);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 3. APPLICATIONS
// ==========================================

// POST /programs/:id/apply - Founders apply to program
mentorshipIncubationRouter.post(
  '/programs/:id/apply',
  authenticate,
  requireRole('founder', 'admin'),
  validateBody(applyProgramSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const founderId = req.user!.id;
      const programId = req.params.id;
      const application = await applicationService.applyToProgram(
        founderId,
        programId,
        req.body
      );
      res.status(201).json({
        data: application,
        message: 'Application submitted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /programs/:id/applications - Incubator lists applications for specific program
mentorshipIncubationRouter.get(
  '/programs/:id/applications',
  authenticate,
  requireRole('incubator', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incubatorId = req.user!.id;
      const userRole = req.user!.role;
      const apps = await applicationService.listProgramApplications(
        incubatorId,
        req.params.id,
        userRole
      );
      res.status(200).json({
        data: apps,
        meta: { total: apps.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /incubators/applications & GET /applications - All applications for current incubator
const handleListIncubatorApps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incubatorId = req.user!.id;
    const apps = await applicationService.listIncubatorApplications(incubatorId);
    res.status(200).json({
      data: apps,
      meta: { total: apps.length },
    });
  } catch (err) {
    next(err);
  }
};

mentorshipIncubationRouter.get(
  '/incubators/applications',
  authenticate,
  requireRole('incubator', 'admin'),
  handleListIncubatorApps
);

mentorshipIncubationRouter.get(
  '/applications',
  authenticate,
  requireRole('incubator', 'admin'),
  handleListIncubatorApps
);

// PATCH /applications/:id/status - Move application through state machine
mentorshipIncubationRouter.patch(
  '/applications/:id/status',
  authenticate,
  requireRole('incubator', 'admin'),
  validateBody(updateApplicationStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incubatorId = req.user!.id;
      const userRole = req.user!.role;
      const updated = await applicationService.updateApplicationStatus(
        incubatorId,
        req.params.id,
        req.body.status,
        req.body.decision_notes,
        userRole
      );
      res.status(200).json({
        data: updated,
        message: `Application status updated to ${req.body.status}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /me/applications - Founder views their applications
mentorshipIncubationRouter.get(
  '/me/applications',
  authenticate,
  requireRole('founder', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const founderId = req.user!.id;
      const apps = await applicationService.listFounderApplications(founderId);
      res.status(200).json({
        data: apps,
        meta: { total: apps.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 4. NOTIFICATIONS
// ==========================================

// GET /notifications - List user's notifications
mentorshipIncubationRouter.get(
  '/notifications',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const notifications = await notificationRetrievalService.listNotifications(userId);
      res.status(200).json({
        data: notifications,
        meta: { total: notifications.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /notifications/unread-count - Count unread
mentorshipIncubationRouter.get(
  '/notifications/unread-count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await notificationRetrievalService.getUnreadCount(userId);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /notifications/:id/read - Mark one as read
mentorshipIncubationRouter.patch(
  '/notifications/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const updated = await notificationRetrievalService.markAsRead(userId, req.params.id);
      res.status(200).json({
        data: updated,
        message: 'Notification marked as read',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /notifications/read-all - Mark all as read
mentorshipIncubationRouter.post(
  '/notifications/read-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await notificationRetrievalService.markAllAsRead(userId);
      res.status(200).json({
        data: result,
        message: 'All notifications marked as read',
      });
    } catch (err) {
      next(err);
    }
  }
);
