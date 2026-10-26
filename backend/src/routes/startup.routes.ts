import { Router } from 'express';
import multer from 'multer';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  createStartupSchema,
  updateStartupSchema,
  teamMemberSchema,
  updateTeamMemberSchema,
  startupFilterSchema,
} from '../schemas/startup.schema.js';
import * as startupService from '../services/startup.service.js';
import * as documentService from '../services/document.service.js';

export const startupRouter = Router();

// Multer memory storage configuration for PDF deck/document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'));
    }
  },
});

// 1. GET /startups - Fast, safe discovery search and filters (public and verified roles)
startupRouter.get('/startups', optionalAuthenticate, async (req, res, next) => {
  try {
    const filter = startupFilterSchema.parse(req.query);
    const result = await startupService.listStartups(filter, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// 2. POST /startups - Founder creates startup (founder or admin only)
startupRouter.post(
  '/startups',
  authenticate,
  requireRole('founder', 'admin'),
  validateBody(createStartupSchema),
  async (req, res, next) => {
    try {
      const startup = await startupService.createStartup(req.user!.id, req.body);
      res.status(201).json({
        data: startup,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 3. GET /startups/:id - Public/filtered startup details with access control
startupRouter.get('/startups/:id', optionalAuthenticate, async (req, res, next) => {
  try {
    const startup = await startupService.getStartupById(req.params.id, req.user);
    res.status(200).json({
      data: startup,
    });
  } catch (error) {
    next(error);
  }
});

// 4. PATCH /startups/:id - Update startup (owner or admin only)
startupRouter.patch(
  '/startups/:id',
  authenticate,
  validateBody(updateStartupSchema),
  async (req, res, next) => {
    try {
      const updated = await startupService.updateStartup(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.body
      );
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 5. DELETE /startups/:id - Delete startup (owner or admin only)
startupRouter.delete('/startups/:id', authenticate, async (req, res, next) => {
  try {
    await startupService.deleteStartup(req.params.id, req.user!.id, req.user!.role);
    res.status(200).json({
      data: {
        message: 'Startup deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// --- Team Member Endpoints ---

// 6. POST /startups/:id/team-members - Add team member (owner or admin only)
startupRouter.post(
  '/startups/:id/team-members',
  authenticate,
  validateBody(teamMemberSchema),
  async (req, res, next) => {
    try {
      const member = await startupService.addTeamMember(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.body
      );
      res.status(201).json({
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 6. GET /startups/:id/team-members - List team members
startupRouter.get('/startups/:id/team-members', async (req, res, next) => {
  try {
    const members = await startupService.listTeamMembers(req.params.id, req.user);
    res.status(200).json({
      data: members,
    });
  } catch (error) {
    next(error);
  }
});

// 7. PATCH /startups/:id/team-members/:memberId - Update team member (owner or admin only)
startupRouter.patch(
  '/startups/:id/team-members/:memberId',
  authenticate,
  validateBody(updateTeamMemberSchema),
  async (req, res, next) => {
    try {
      const member = await startupService.updateTeamMember(
        req.params.id,
        req.params.memberId,
        req.user!.id,
        req.user!.role,
        req.body
      );
      res.status(200).json({
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 8. DELETE /startups/:id/team-members/:memberId - Delete team member (owner or admin only)
startupRouter.delete(
  '/startups/:id/team-members/:memberId',
  authenticate,
  async (req, res, next) => {
    try {
      await startupService.deleteTeamMember(
        req.params.id,
        req.params.memberId,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        data: {
          message: 'Team member removed successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- Documents Endpoints on Startups ---

// 9. POST /startups/:id/documents - Upload pitch deck or document (PDF only, max 10MB, increments version)
startupRouter.post(
  '/startups/:id/documents',
  authenticate,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No document file was uploaded', 400, 'FILE_REQUIRED');
      }

      const document = await documentService.uploadDocument(
        req.params.id,
        req.user!,
        req.file,
        {
          title: req.body.title,
          visibility: req.body.visibility,
        }
      );

      res.status(201).json({
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 10. GET /startups/:id/documents - List documents
startupRouter.get('/startups/:id/documents', optionalAuthenticate, async (req, res, next) => {
  try {
    const docs = await documentService.listDocuments(req.params.id, req.user);
    res.status(200).json({
      data: docs,
    });
  } catch (error) {
    next(error);
  }
});

// 11. GET /startups/:id/document-access-requests - Founder lists access requests
startupRouter.get(
  '/startups/:id/document-access-requests',
  authenticate,
  async (req, res, next) => {
    try {
      const requests = await documentService.listStartupAccessRequests(
        req.params.id,
        req.user!
      );
      res.status(200).json({
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }
);

