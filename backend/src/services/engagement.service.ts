import crypto from 'node:crypto';
import { inMemoryDb } from '../db/index.js';
import type {
  PipelineStatus,
  RequestStatus,
  WatchlistEntry,
  InvestorNote,
  InvestorStartupStatus,
  PipelineHistory,
  PitchRequest,
  PitchRequestMessage,
  Connection,
  Message,
  Startup,
  Profile,
} from '../db/schema.types.js';
import { AppError } from '../middleware/error.middleware.js';
import { notify } from './notification.service.js';
import type {
  CreatePitchRequestInput,
  RespondPitchRequestInput,
  PitchRequestMessageInput,
} from '../schemas/engagement.schema.js';

/**
 * Valid state transitions for the investor pipeline state machine.
 */
export const PIPELINE_TRANSITIONS: Record<PipelineStatus, PipelineStatus[]> = {
  interested: ['meeting_requested', 'follow_up', 'passed'],
  meeting_requested: ['in_discussion', 'follow_up', 'passed'],
  in_discussion: ['follow_up', 'passed', 'meeting_requested'],
  follow_up: ['meeting_requested', 'in_discussion', 'passed'],
  passed: ['interested', 'follow_up'],
};

export class EngagementService {
  // ==========================================
  // 1. WATCHLIST & PRIVATE NOTES
  // ==========================================

  async addToWatchlist(
    investorId: string,
    startupId: string
  ): Promise<{ entry: WatchlistEntry; message: string }> {
    const startup = inMemoryDb.startups.get(startupId);
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    const alreadyIn = inMemoryDb.isInWatchlist(investorId, startupId);
    if (alreadyIn) {
      const existing = inMemoryDb.getWatchlist(investorId).find((w) => w.startup_id === startupId)!;
      return {
        entry: existing,
        message: 'Startup already in watchlist',
      };
    }

    const entry = inMemoryDb.addToWatchlist({
      id: `w-${investorId}-${startupId}`,
      investor_id: investorId,
      startup_id: startupId,
      created_at: new Date().toISOString(),
    });

    await notify(
      investorId,
      'watchlist_added',
      { startup_id: startupId, name: startup.name },
      'Added to Watchlist',
      `${startup.name} added to your watchlist`
    );

    return {
      entry,
      message: 'Startup added to watchlist',
    };
  }

  async removeFromWatchlist(
    investorId: string,
    startupId: string
  ): Promise<{ success: boolean; message: string }> {
    const startup = inMemoryDb.startups.get(startupId);
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    const removed = inMemoryDb.removeFromWatchlist(investorId, startupId);
    return {
      success: true,
      message: removed ? 'Startup removed from watchlist' : 'Startup was not in watchlist',
    };
  }

  async getWatchlist(
    investorId: string
  ): Promise<Array<WatchlistEntry & { startup: Startup; note: string | null; pipeline_status: PipelineStatus | null }>> {
    return inMemoryDb.getWatchlist(investorId);
  }

  async getInvestorNote(
    investorId: string,
    startupId: string
  ): Promise<InvestorNote> {
    const note = inMemoryDb.getInvestorNote(investorId, startupId);
    if (!note) {
      throw new AppError('No private note found for this startup', 404, 'NOTE_NOT_FOUND');
    }
    return note;
  }

  async saveInvestorNote(
    investorId: string,
    startupId: string,
    noteText: string
  ): Promise<InvestorNote> {
    const startup = inMemoryDb.startups.get(startupId);
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    const saved = inMemoryDb.saveInvestorNote({
      id: `note-${investorId}-${startupId}`,
      investor_id: investorId,
      startup_id: startupId,
      note: noteText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return saved;
  }

  async deleteInvestorNote(
    investorId: string,
    startupId: string
  ): Promise<{ success: boolean }> {
    const deleted = inMemoryDb.deleteInvestorNote(investorId, startupId);
    if (!deleted) {
      throw new AppError('No private note found to delete', 404, 'NOTE_NOT_FOUND');
    }
    return { success: true };
  }

  // ==========================================
  // 2. PIPELINE TRACKER & STATE MACHINE
  // ==========================================

  async getPipeline(
    investorId: string
  ): Promise<Record<PipelineStatus, Array<InvestorStartupStatus & { startup: Startup; note: string | null; history_count: number }>>> {
    return inMemoryDb.getPipelineGrouped(investorId);
  }

  async getPipelineHistory(
    investorId: string,
    startupId: string
  ): Promise<PipelineHistory[]> {
    return inMemoryDb.getPipelineHistory(investorId, startupId);
  }

  async setPipelineStatus(
    investorId: string,
    startupId: string,
    toStatus: PipelineStatus,
    notes?: string
  ): Promise<{ current: InvestorStartupStatus; history: PipelineHistory }> {
    const startup = inMemoryDb.startups.get(startupId);
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    const currentRecord = inMemoryDb.getPipelineStatus(investorId, startupId);

    if (currentRecord) {
      const fromStatus = currentRecord.status;

      // Idempotent update if already in target status
      if (fromStatus === toStatus) {
        const hist = inMemoryDb.getPipelineHistory(investorId, startupId);
        return {
          current: currentRecord,
          history: hist[hist.length - 1] || {
            id: `pipehist-noop`,
            investor_id: investorId,
            startup_id: startupId,
            from_status: fromStatus,
            to_status: toStatus,
            notes: notes || null,
            created_at: new Date().toISOString(),
          },
        };
      }

      // State machine validation
      const allowedNextStatuses = PIPELINE_TRANSITIONS[fromStatus] || [];
      if (!allowedNextStatuses.includes(toStatus)) {
        throw new AppError(
          `Cannot transition pipeline status from '${fromStatus}' to '${toStatus}'. Allowed transitions: [${allowedNextStatuses.join(', ')}]`,
          400,
          'INVALID_PIPELINE_TRANSITION'
        );
      }
    }

    const result = inMemoryDb.setPipelineStatus(investorId, startupId, toStatus, notes);

    await notify(
      investorId,
      'pipeline_updated',
      { startup_id: startupId, to_status: toStatus },
      'Pipeline Status Updated',
      `${startup.name} moved to ${toStatus.replace('_', ' ')}`
    );

    if (toStatus === 'meeting_requested') {
      await notify(
        startup.founder_id,
        'investor_meeting_interest',
        { investor_id: investorId, startup_id: startupId },
        'Meeting Requested',
        `An investor marked ${startup.name} for meeting request`
      );
    }

    return result;
  }

  // ==========================================
  // 3. PITCH MEETING REQUESTS
  // ==========================================

  async createPitchRequest(
    investorId: string,
    input: CreatePitchRequestInput
  ): Promise<PitchRequest> {
    const startup = inMemoryDb.startups.get(input.startup_id);
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    // Check duplicate pending requests
    const existing = Array.from(inMemoryDb.pitchRequests.values()).find(
      (pr) =>
        pr.startup_id === input.startup_id &&
        pr.investor_id === investorId &&
        pr.status === 'pending'
    );
    if (existing) {
      throw new AppError('A pending pitch meeting request already exists for this startup', 409, 'DUPLICATE_PITCH_REQUEST');
    }

    const pitchRequest: PitchRequest = {
      id: crypto.randomUUID(),
      startup_id: input.startup_id,
      investor_id: investorId,
      status: 'pending',
      proposed_date: input.proposed_date,
      message: input.message,
      pitch_deck_url: startup.pitch_deck_url || null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = inMemoryDb.createPitchRequest(pitchRequest);

    // Auto-update investor pipeline to 'meeting_requested' if possible
    try {
      const currentPipeline = inMemoryDb.getPipelineStatus(investorId, input.startup_id);
      if (!currentPipeline) {
        inMemoryDb.setPipelineStatus(investorId, input.startup_id, 'meeting_requested', input.message);
      } else if (
        currentPipeline.status === 'interested' ||
        currentPipeline.status === 'follow_up'
      ) {
        inMemoryDb.setPipelineStatus(investorId, input.startup_id, 'meeting_requested', input.message);
      }
    } catch (e) {
      // Pipeline auto-update non-blocking
    }

    // Notify founder
    await notify(
      startup.founder_id,
      'pitch_request_received',
      {
        pitch_request_id: saved.id,
        startup_id: input.startup_id,
        proposed_date: input.proposed_date,
      },
      'Pitch Meeting Requested',
      `An investor requested a meeting for ${startup.name} on ${new Date(input.proposed_date).toLocaleDateString()}`
    );

    return saved;
  }

  async listPitchRequests(
    userId: string,
    userRole: string,
    filterStatus?: RequestStatus
  ): Promise<Array<PitchRequest & { startup: Startup; partner_profile: Profile }>> {
    let requests: PitchRequest[] = [];

    if (userRole === 'admin') {
      requests = inMemoryDb.listPitchRequests({ status: filterStatus });
    } else if (userRole === 'founder') {
      requests = inMemoryDb.listPitchRequests({ founderId: userId, status: filterStatus });
    } else {
      requests = inMemoryDb.listPitchRequests({ investorId: userId, status: filterStatus });
    }

    const results: Array<PitchRequest & { startup: Startup; partner_profile: Profile }> = [];
    for (const pr of requests) {
      const st = inMemoryDb.startups.get(pr.startup_id);
      if (!st) continue;
      const partnerId = userRole === 'founder' ? pr.investor_id : st.founder_id;
      const partner = inMemoryDb.profiles.get(partnerId);
      if (!partner) continue;

      results.push({
        ...pr,
        startup: { ...st },
        partner_profile: { ...partner },
      });
    }

    return results;
  }

  async getPitchRequestById(
    userId: string,
    userRole: string,
    requestId: string
  ): Promise<PitchRequest & { startup: Startup; messages: PitchRequestMessage[] }> {
    const pr = inMemoryDb.getPitchRequestById(requestId);
    if (!pr) {
      throw new AppError('Pitch request not found', 404, 'NOT_FOUND');
    }
    const st = inMemoryDb.startups.get(pr.startup_id);
    if (!st) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    // Check authorization: caller must be founder of the startup, requesting investor, or admin
    if (userRole !== 'admin' && pr.investor_id !== userId && st.founder_id !== userId) {
      throw new AppError('Access denied to this pitch request', 403, 'FORBIDDEN_RESOURCE');
    }

    const messages = inMemoryDb.listPitchRequestMessages(requestId);
    return {
      ...pr,
      startup: { ...st },
      messages,
    };
  }

  async respondToPitchRequest(
    userId: string,
    userRole: string,
    requestId: string,
    input: RespondPitchRequestInput
  ): Promise<PitchRequest> {
    const pr = inMemoryDb.getPitchRequestById(requestId);
    if (!pr) {
      throw new AppError('Pitch request not found', 404, 'NOT_FOUND');
    }
    const st = inMemoryDb.startups.get(pr.startup_id);
    if (!st) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    // A founder cannot act on another founder's requests!
    if (userRole !== 'admin' && st.founder_id !== userId) {
      throw new AppError("A founder cannot act on another founder's requests", 403, 'FORBIDDEN_RESOURCE');
    }

    let updatedStatus: RequestStatus = pr.status;
    const updates: Partial<PitchRequest> = {
      response_message: input.message || null,
    };

    if (input.action === 'accept') {
      updatedStatus = 'approved';
      updates.status = 'approved';

      // Move investor pipeline to 'in_discussion'
      try {
        const pipe = inMemoryDb.getPipelineStatus(pr.investor_id, pr.startup_id);
        if (pipe && pipe.status === 'meeting_requested') {
          inMemoryDb.setPipelineStatus(pr.investor_id, pr.startup_id, 'in_discussion', 'Pitch request accepted');
        }
      } catch (e) {
        // Non-blocking
      }

      await notify(
        pr.investor_id,
        'pitch_request_accepted',
        { pitch_request_id: pr.id, startup_id: pr.startup_id },
        'Pitch Request Accepted',
        `${st.name} accepted your pitch meeting request! Messaging is now unlocked.`
      );
    } else if (input.action === 'decline') {
      updatedStatus = 'rejected';
      updates.status = 'rejected';

      await notify(
        pr.investor_id,
        'pitch_request_declined',
        { pitch_request_id: pr.id, startup_id: pr.startup_id },
        'Pitch Request Declined',
        `${st.name} declined the pitch meeting request`
      );
    } else if (input.action === 'reschedule') {
      updates.counter_date = input.proposed_date;
      updates.status = 'pending';

      await notify(
        pr.investor_id,
        'pitch_request_rescheduled',
        {
          pitch_request_id: pr.id,
          startup_id: pr.startup_id,
          counter_date: input.proposed_date,
        },
        'Pitch Meeting Reschedule Proposed',
        `${st.name} proposed an alternative meeting date`
      );
    }

    const updated = inMemoryDb.updatePitchRequest(requestId, updates);
    return updated!;
  }

  async addPitchRequestMessage(
    userId: string,
    userRole: string,
    requestId: string,
    input: PitchRequestMessageInput
  ): Promise<PitchRequestMessage> {
    const pr = inMemoryDb.getPitchRequestById(requestId);
    if (!pr) {
      throw new AppError('Pitch request not found', 404, 'NOT_FOUND');
    }
    const st = inMemoryDb.startups.get(pr.startup_id);
    if (!st) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    if (userRole !== 'admin' && pr.investor_id !== userId && st.founder_id !== userId) {
      throw new AppError('Access denied to this pitch request thread', 403, 'FORBIDDEN_RESOURCE');
    }

    const msg: PitchRequestMessage = {
      id: crypto.randomUUID(),
      pitch_request_id: requestId,
      sender_id: userId,
      message_type: input.message_type || 'info_request',
      content: input.content,
      created_at: new Date().toISOString(),
    };

    const saved = inMemoryDb.addPitchRequestMessage(msg);

    const recipientId = userId === pr.investor_id ? st.founder_id : pr.investor_id;
    await notify(
      recipientId,
      'pitch_request_info_message',
      { pitch_request_id: requestId, message_id: saved.id },
      'Information Request on Meeting',
      `New query received regarding pitch meeting for ${st.name}`
    );

    return saved;
  }

  // ==========================================
  // 4. CONNECTIONS
  // ==========================================

  async createConnection(
    userAId: string,
    recipientId: string,
    message?: string
  ): Promise<Connection> {
    if (userAId === recipientId) {
      throw new AppError('Cannot create a connection with yourself', 400, 'INVALID_REQUEST');
    }

    const recipient = inMemoryDb.profiles.get(recipientId);
    if (!recipient) {
      throw new AppError('Target user for connection not found', 404, 'NOT_FOUND');
    }

    const existing = inMemoryDb.findConnection(userAId, recipientId);
    if (existing) {
      throw new AppError('A connection request between these users already exists', 409, 'DUPLICATE_CONNECTION_REQUEST');
    }

    const conn = inMemoryDb.createConnection(userAId, recipientId);

    const sender = inMemoryDb.profiles.get(userAId);
    await notify(
      recipientId,
      'connection_request_received',
      { connection_id: conn.id, sender_id: userAId },
      'New Connection Request',
      `${sender?.full_name || 'A user'} wants to connect with you`
    );

    return conn;
  }

  async respondToConnection(
    userId: string,
    connectionId: string,
    action: 'accept' | 'decline'
  ): Promise<Connection> {
    const conn = inMemoryDb.getConnectionById(connectionId);
    if (!conn) {
      throw new AppError('Connection not found', 404, 'NOT_FOUND');
    }

    // Only recipient (user_b_id) can accept or decline
    if (conn.user_b_id !== userId) {
      throw new AppError('Only the connection recipient can accept or decline this request', 403, 'FORBIDDEN_RESOURCE');
    }

    const newStatus: RequestStatus = action === 'accept' ? 'approved' : 'rejected';
    const updated = inMemoryDb.updateConnection(connectionId, newStatus);

    const recipient = inMemoryDb.profiles.get(userId);
    await notify(
      conn.user_a_id,
      action === 'accept' ? 'connection_accepted' : 'connection_declined',
      { connection_id: connectionId, partner_id: userId },
      action === 'accept' ? 'Connection Accepted' : 'Connection Declined',
      `${recipient?.full_name || 'A user'} ${action === 'accept' ? 'accepted' : 'declined'} your connection request`
    );

    return updated!;
  }

  async listConnections(
    userId: string,
    filterStatus?: RequestStatus
  ): Promise<Array<Connection & { partner: Profile }>> {
    return inMemoryDb.listConnections(userId, filterStatus);
  }

  // ==========================================
  // 5. MESSAGING & CONVERSATIONS
  // ==========================================

  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string
  ): Promise<Message> {
    if (senderId === recipientId) {
      throw new AppError('Cannot send a message to yourself', 400, 'INVALID_REQUEST');
    }

    const recipient = inMemoryDb.profiles.get(recipientId);
    if (!recipient) {
      throw new AppError('Recipient not found', 404, 'NOT_FOUND');
    }

    // Messaging authorization check
    const allowed = inMemoryDb.canUsersMessage(senderId, recipientId);
    if (!allowed) {
      throw new AppError('Messaging is allowed only between connected users, or between the parties of an accepted pitch request.', 403, 'MESSAGING_NOT_ALLOWED');
    }

    const msg: Message = {
      id: crypto.randomUUID(),
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    const saved = inMemoryDb.sendMessage(msg);

    const sender = inMemoryDb.profiles.get(senderId);
    await notify(
      recipientId,
      'new_message',
      { sender_id: senderId, message_id: saved.id },
      'New Direct Message',
      `New message from ${sender?.full_name || 'User'}: ${content.slice(0, 50)}...`
    );

    return saved;
  }

  async listMessagesBetween(
    userId: string,
    otherUserId: string
  ): Promise<Message[]> {
    const allowed = inMemoryDb.canUsersMessage(userId, otherUserId);
    if (!allowed) {
      throw new AppError('Messaging is blocked between unconnected users.', 403, 'MESSAGING_NOT_ALLOWED');
    }

    return inMemoryDb.listMessagesBetween(userId, otherUserId);
  }

  async markConversationRead(
    userId: string,
    otherUserId: string
  ): Promise<{ marked_count: number }> {
    const count = inMemoryDb.markMessagesAsRead(otherUserId, userId);
    return { marked_count: count };
  }

  async listConversations(
    userId: string
  ): Promise<Array<{
    conversation_id: string;
    other_user: Profile;
    last_message: Message;
    unread_count: number;
  }>> {
    return inMemoryDb.listConversations(userId);
  }
}

export const engagementService = new EngagementService();
