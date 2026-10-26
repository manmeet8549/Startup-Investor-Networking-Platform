import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  createDocumentAccessRequestSchema,
  reviewDocumentAccessRequestSchema,
} from '../schemas/startup.schema.js';
import * as documentService from '../services/document.service.js';

export const documentRouter = Router();

// Document routes require authentication
documentRouter.use('/documents', authenticate);
documentRouter.use('/document-access-requests', authenticate);

// 1. DELETE /documents/:id - Delete document (owner or admin only)
documentRouter.delete('/documents/:id', async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.params.id, req.user!);
    res.status(200).json({
      data: {
        message: 'Document deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. POST /documents/:id/access-requests - Request access to access-controlled pitch deck
documentRouter.post(
  '/documents/:id/access-requests',
  validateBody(createDocumentAccessRequestSchema),
  async (req, res, next) => {
    try {
      const request = await documentService.requestDocumentAccess(
        req.params.id,
        req.user!,
        req.body.notes
      );
      res.status(201).json({
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 3. POST /document-access-requests/:id/approve - Founder approves access request
documentRouter.post(
  '/document-access-requests/:id/approve',
  validateBody(reviewDocumentAccessRequestSchema),
  async (req, res, next) => {
    try {
      const updated = await documentService.reviewDocumentAccessRequest(
        req.params.id,
        'approved',
        req.user!,
        req.body.notes
      );
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 4. POST /document-access-requests/:id/decline - Founder declines access request
documentRouter.post(
  '/document-access-requests/:id/decline',
  validateBody(reviewDocumentAccessRequestSchema),
  async (req, res, next) => {
    try {
      const updated = await documentService.reviewDocumentAccessRequest(
        req.params.id,
        'rejected',
        req.user!,
        req.body.notes
      );
      res.status(200).json({
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 5. GET /documents/:id/download - Returns 60-second signed URL only when allowed
documentRouter.get('/documents/:id/download', async (req, res, next) => {
  try {
    const result = await documentService.getDocumentDownloadUrl(
      req.params.id,
      req.user!
    );
    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
