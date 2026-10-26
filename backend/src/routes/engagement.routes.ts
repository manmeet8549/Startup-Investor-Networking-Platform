import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { engagementService } from '../services/engagement.service.js';
import {
  setPipelineStatusSchema,
  investorNoteSchema,
  createPitchRequestSchema,
  respondPitchRequestSchema,
  pitchRequestMessageSchema,
  createConnectionSchema,
  respondConnectionSchema,
  sendMessageSchema,
} from '../schemas/engagement.schema.js';
import type { RequestStatus } from '../db/schema.types.js';

export const engagementRouter = Router();

// All engagement routes require authentication on their specific subpaths
engagementRouter.use('/watchlist', authenticate);
engagementRouter.use('/pipeline', authenticate);
engagementRouter.use('/pitch-requests', authenticate);
engagementRouter.use('/connections', authenticate);
engagementRouter.use('/conversations', authenticate);
engagementRouter.use('/messages', authenticate);
engagementRouter.use('/startups/:id/notes', authenticate);

// ==========================================
// 1. WATCHLIST & PRIVATE NOTES
// ==========================================

// POST /watchlist/:startup_id
engagementRouter.post(
  '/watchlist/:startup_id',
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const startupId = req.params.startup_id;
      const result = await engagementService.addToWatchlist(investorId, startupId);
      res.status(201).json({
        data: result.entry,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /watchlist/:startup_id
engagementRouter.delete(
  '/watchlist/:startup_id',
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const startupId = req.params.startup_id;
      const result = await engagementService.removeFromWatchlist(investorId, startupId);
      res.status(200).json({
        data: { startup_id: startupId },
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /watchlist
engagementRouter.get(
  '/watchlist',
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const items = await engagementService.getWatchlist(investorId);
      res.status(200).json({
        data: items,
        meta: { total: items.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /startups/:id/notes
engagementRouter.get(
  '/startups/:id/notes',
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const startupId = req.params.id;
      const note = await engagementService.getInvestorNote(investorId, startupId);
      res.status(200).json({ data: note });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /startups/:id/notes
engagementRouter.put(
  '/startups/:id/notes',
  requireRole('investor', 'admin'),
  validateBody(investorNoteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const startupId = req.params.id;
      const saved = await engagementService.saveInvestorNote(
        investorId,
        startupId,
        req.body.note
      );
      res.status(200).json({ data: saved });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /startups/:id/notes
engagementRouter.delete(
  '/startups/:id/notes',
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const startupId = req.params.id;
      await engagementService.deleteInvestorNote(investorId, startupId);
      res.status(200).json({
        data: { startup_id: startupId },
        message: 'Note deleted',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 2. PIPELINE TRACKER
// ==========================================

// GET /pipeline
engagementRouter.get(
  '/pipeline',
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const pipeline = await engagementService.getPipeline(investorId);
      res.status(200).json({ data: pipeline });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /pipeline/:startup_id
engagementRouter.put(
  '/pipeline/:startup_id',
  requireRole('investor', 'admin'),
  validateBody(setPipelineStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const startupId = req.params.startup_id;
      const result = await engagementService.setPipelineStatus(
        investorId,
        startupId,
        req.body.status,
        req.body.notes
      );
      res.status(200).json({
        data: result.current,
        history: result.history,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /pipeline/:startup_id/history
engagementRouter.get(
  '/pipeline/:startup_id/history',
  requireRole('investor', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const startupId = req.params.startup_id;
      const history = await engagementService.getPipelineHistory(investorId, startupId);
      res.status(200).json({ data: history });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 3. PITCH MEETING REQUESTS
// ==========================================

// POST /pitch-requests
engagementRouter.post(
  '/pitch-requests',
  requireRole('investor', 'admin'),
  validateBody(createPitchRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investorId = req.user!.id;
      const pitchReq = await engagementService.createPitchRequest(investorId, req.body);
      res.status(201).json({ data: pitchReq });
    } catch (err) {
      next(err);
    }
  }
);

// GET /pitch-requests
engagementRouter.get(
  '/pitch-requests',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const statusFilter = req.query.status as RequestStatus | undefined;
      const list = await engagementService.listPitchRequests(userId, userRole, statusFilter);
      res.status(200).json({ data: list });
    } catch (err) {
      next(err);
    }
  }
);

// GET /pitch-requests/:id
engagementRouter.get(
  '/pitch-requests/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const requestId = req.params.id;
      const item = await engagementService.getPitchRequestById(userId, userRole, requestId);
      res.status(200).json({ data: item });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /pitch-requests/:id/respond
engagementRouter.patch(
  '/pitch-requests/:id/respond',
  validateBody(respondPitchRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const requestId = req.params.id;
      const updated = await engagementService.respondToPitchRequest(
        userId,
        userRole,
        requestId,
        req.body
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// POST /pitch-requests/:id/messages
engagementRouter.post(
  '/pitch-requests/:id/messages',
  validateBody(pitchRequestMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const requestId = req.params.id;
      const msg = await engagementService.addPitchRequestMessage(
        userId,
        userRole,
        requestId,
        req.body
      );
      res.status(201).json({ data: msg });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 4. CONNECTIONS
// ==========================================

// POST /connections
engagementRouter.post(
  '/connections',
  validateBody(createConnectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = req.user!.id;
      const conn = await engagementService.createConnection(
        senderId,
        req.body.recipient_id,
        req.body.message
      );
      res.status(201).json({ data: conn });
    } catch (err) {
      next(err);
    }
  }
);

// GET /connections
engagementRouter.get(
  '/connections',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const statusFilter = req.query.status as RequestStatus | undefined;
      const conns = await engagementService.listConnections(userId, statusFilter);
      res.status(200).json({ data: conns });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /connections/:id
engagementRouter.patch(
  '/connections/:id',
  validateBody(respondConnectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const connectionId = req.params.id;
      const updated = await engagementService.respondToConnection(
        userId,
        connectionId,
        req.body.action
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 5. CONVERSATIONS & MESSAGES
// ==========================================

// GET /conversations
engagementRouter.get(
  '/conversations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const convs = await engagementService.listConversations(userId);
      res.status(200).json({ data: convs });
    } catch (err) {
      next(err);
    }
  }
);

// GET /conversations/:id/messages
engagementRouter.get(
  '/conversations/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const otherUserId = req.params.id;
      const msgs = await engagementService.listMessagesBetween(userId, otherUserId);
      res.status(200).json({ data: msgs });
    } catch (err) {
      next(err);
    }
  }
);

// POST /conversations/:id/messages
engagementRouter.post(
  '/conversations/:id/messages',
  validateBody(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = req.user!.id;
      const otherUserId = req.params.id;
      const msg = await engagementService.sendMessage(
        senderId,
        otherUserId,
        req.body.content
      );
      res.status(201).json({ data: msg });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /conversations/:id/read
engagementRouter.patch(
  '/conversations/:id/read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const otherUserId = req.params.id;
      const result = await engagementService.markConversationRead(userId, otherUserId);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /messages (Direct send alternative)
engagementRouter.post(
  '/messages',
  validateBody(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = req.user!.id;
      const recipientId = req.body.recipient_id;
      if (!recipientId) {
        res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'recipient_id is required',
          },
        });
        return;
      }
      const msg = await engagementService.sendMessage(
        senderId,
        recipientId,
        req.body.content
      );
      res.status(201).json({ data: msg });
    } catch (err) {
      next(err);
    }
  }
);
