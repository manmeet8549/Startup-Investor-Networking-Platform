import crypto from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import { config } from '../config.js';
import type {
  MentorshipRequest,
  MentorFeedback,
  IncubatorProgram,
  Application,
  Notification,
  ApplicationStatus,
  RequestStatus,
  Profile,
  MentorProfile,
  Startup,
} from '../db/schema.types.js';
import { AppError } from '../middleware/error.middleware.js';
import { notify } from './notification.service.js';

// ==========================================
// APPLICATION STATE MACHINE
// ==========================================
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['shortlisted', 'rejected'],
  shortlisted: ['accepted', 'rejected'],
  accepted: [],
  rejected: ['under_review'],
};

// ==========================================
// 1. MENTORSHIP SERVICE
// ==========================================
export class MentorshipService {
  async listMentors(
    expertise?: string
  ): Promise<any[]> {
    const list = inMemoryDb.listMentors(expertise);
    return list.map((item: any) => {
      const p = item.profile || item;
      const mp = item.mentor_profile || item;
      const expertiseList = mp?.expertise || mp?.expertise_areas || [];
      return {
        id: p.id,
        user_id: p.id,
        full_name: p.full_name,
        email: p.email,
        bio: mp?.bio || p.bio,
        location: p.location,
        organization: p.organization,
        website: p.website,
        expertise: expertiseList,
        expertise_areas: expertiseList,
        experience: mp?.experience || 0,
        years_of_experience: mp?.experience || 0,
        linkedin_url: mp?.linkedin_url || null,
        profile: p,
        mentor_profile: mp,
      };
    });
  }

  async getMentorById(
    mentorId: string
  ): Promise<any> {
    const profile = inMemoryDb.getProfileById(mentorId);
    if (!profile || profile.role !== 'mentor') {
      throw new AppError('Mentor not found', 404, 'NOT_FOUND');
    }
    const mentor_profile = inMemoryDb.mentorProfiles.get(mentorId) || null;
    const expertiseList = mentor_profile?.expertise || (mentor_profile as any)?.expertise_areas || [];
    return {
      id: profile.id,
      user_id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      bio: mentor_profile?.bio || profile.bio,
      location: profile.location,
      organization: profile.organization,
      website: profile.website,
      expertise: expertiseList,
      expertise_areas: expertiseList,
      experience: mentor_profile?.experience || 0,
      years_of_experience: mentor_profile?.experience || 0,
      linkedin_url: mentor_profile?.linkedin_url || null,
      profile,
      mentor_profile,
    };
  }

  async createMentorshipRequest(
    founderId: string,
    data: {
      mentor_id: string;
      startup_id?: string | null;
      topic: string;
      message: string;
    }
  ): Promise<MentorshipRequest> {
    const mentor = inMemoryDb.getProfileById(data.mentor_id);
    if (!mentor || mentor.role !== 'mentor') {
      throw new AppError('Mentor not found', 404, 'NOT_FOUND');
    }

    if (data.startup_id) {
      const startup = inMemoryDb.startups.get(data.startup_id);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'NOT_FOUND');
      }
      if (startup.founder_id !== founderId) {
        throw new AppError('Startup does not belong to you', 403, 'FORBIDDEN_RESOURCE');
      }
    }

    const req: MentorshipRequest = {
      id: crypto.randomUUID(),
      founder_id: founderId,
      mentor_id: data.mentor_id,
      startup_id: data.startup_id || null,
      topic: data.topic || 'General Mentorship',
      message: data.message,
      status: 'pending',
      response_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = inMemoryDb.createMentorshipRequest(req);

    const founder = inMemoryDb.getProfileById(founderId);
    await notify(
      data.mentor_id,
      'mentorship_request',
      { request_id: saved.id, founder_id: founderId },
      'New Mentorship Request',
      `${founder?.full_name || 'A founder'} sent you a mentorship request on "${req.topic}"`
    );

    return saved;
  }

  async listMentorshipRequests(filter: {
    mentorId?: string;
    founderId?: string;
    status?: RequestStatus;
  }): Promise<
    Array<
      MentorshipRequest & {
        founder: Profile | null;
        mentor: Profile | null;
        startup: Startup | null;
      }
    >
  > {
    const items = inMemoryDb.listMentorshipRequests(filter);
    return items.map((r) => ({
      ...r,
      founder: inMemoryDb.getProfileById(r.founder_id),
      mentor: inMemoryDb.getProfileById(r.mentor_id),
      startup: r.startup_id ? inMemoryDb.startups.get(r.startup_id) || null : null,
    }));
  }

  async respondToMentorshipRequest(
    userId: string,
    requestId: string,
    action: 'accept' | 'decline' | 'approve' | 'reject',
    responseNote?: string
  ): Promise<MentorshipRequest> {
    const req = inMemoryDb.getMentorshipRequestById(requestId);
    if (!req) {
      throw new AppError('Mentorship request not found', 404, 'NOT_FOUND');
    }

    // Security check: only target mentor can respond
    if (req.mentor_id !== userId) {
      throw new AppError('Only the target mentor can respond to this request', 403, 'FORBIDDEN_RESOURCE');
    }

    const newStatus: RequestStatus = action === 'accept' || action === 'approve' ? 'accepted' : 'declined';
    const updated = inMemoryDb.updateMentorshipRequest(requestId, {
      status: newStatus,
      response_note: responseNote || null,
    });

    const mentor = inMemoryDb.getProfileById(userId);
    const verb = newStatus === 'accepted' ? 'accepted' : 'declined';
    await notify(
      req.founder_id,
      newStatus === 'accepted' ? 'mentorship_accepted' : 'mentorship_declined',
      { request_id: requestId, mentor_id: userId },
      newStatus === 'accepted' ? 'Mentorship Request Accepted' : 'Mentorship Request Declined',
      `${mentor?.full_name || 'The mentor'} ${verb} your mentorship request on "${req.topic}"`
    );

    return updated!;
  }

  async createStartupFeedback(
    mentorId: string,
    startupId: string,
    data: {
      feedback: string;
      rating: number;
      mentorship_request_id?: string | null;
    }
  ): Promise<MentorFeedback> {
    const startup = inMemoryDb.startups.get(startupId);
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    const fb: MentorFeedback = {
      id: crypto.randomUUID(),
      mentorship_request_id: data.mentorship_request_id || null,
      mentor_id: mentorId,
      startup_id: startupId,
      feedback: data.feedback,
      rating: data.rating,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = inMemoryDb.addMentorFeedback(fb);

    const mentor = inMemoryDb.getProfileById(mentorId);
    await notify(
      startup.founder_id,
      'mentor_feedback',
      { feedback_id: saved.id, startup_id: startupId, rating: data.rating },
      'New Mentor Feedback',
      `${mentor?.full_name || 'A mentor'} shared guidance and rated your startup ${data.rating}/5 stars`
    );

    return saved;
  }

  async listStartupFeedback(startupId: string): Promise<Array<MentorFeedback & { mentor: Profile | null }>> {
    const list = inMemoryDb.listMentorFeedback(startupId);
    return list.map((fb) => ({
      ...fb,
      mentor: inMemoryDb.getProfileById(fb.mentor_id),
    }));
  }
}

// ==========================================
// 2. INCUBATOR SERVICE
// ==========================================
export class IncubatorService {
  async createProgram(
    incubatorId: string,
    data: {
      title?: string;
      name?: string;
      description?: string;
      eligibility?: string;
      benefits: string;
      sectors: string[];
      stages?: string[];
      deadline: string;
    }
  ): Promise<IncubatorProgram> {
    const pName = data.title || data.name || 'Incubation Program';
    const pDesc = data.eligibility || data.description || '';

    const program: IncubatorProgram = {
      id: crypto.randomUUID(),
      incubator_id: incubatorId,
      name: pName,
      title: pName,
      description: pDesc,
      eligibility: pDesc,
      benefits: data.benefits,
      sectors: data.sectors,
      stages: data.stages || [],
      deadline: new Date(data.deadline).toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = inMemoryDb.createProgram(program);
    return saved;
  }

  async getProgramById(
    programId: string
  ): Promise<IncubatorProgram & { incubator: Profile | null; applications_count: number }> {
    const p = inMemoryDb.getProgramById(programId);
    if (!p) {
      throw new AppError('Program not found', 404, 'NOT_FOUND');
    }
    const incubator = inMemoryDb.getProfileById(p.incubator_id);
    const apps = inMemoryDb.listApplications({ programId });
    return {
      ...p,
      title: p.title || p.name,
      eligibility: p.eligibility || p.description,
      incubator,
      applications_count: apps.length,
    };
  }

  async listPrograms(filter?: {
    sector?: string;
    stage?: string;
    activeOnly?: boolean;
    incubatorId?: string;
  }): Promise<Array<IncubatorProgram & { incubator: Profile | null; applications_count: number }>> {
    const list = inMemoryDb.listPrograms(filter);
    return list.map((p) => {
      const incubator = inMemoryDb.getProfileById(p.incubator_id);
      const apps = inMemoryDb.listApplications({ programId: p.id });
      return {
        ...p,
        title: p.title || p.name,
        eligibility: p.eligibility || p.description,
        incubator,
        applications_count: apps.length,
      };
    });
  }

  async updateProgram(
    incubatorId: string,
    programId: string,
    updates: Partial<IncubatorProgram>,
    userRole?: string
  ): Promise<IncubatorProgram> {
    const program = inMemoryDb.getProgramById(programId);
    if (!program) {
      throw new AppError('Program not found', 404, 'NOT_FOUND');
    }

    if (program.incubator_id !== incubatorId && userRole !== 'admin') {
      throw new AppError('Only the owning incubator can update this program', 403, 'FORBIDDEN_RESOURCE');
    }

    const title = updates.title || updates.name || program.title || program.name;
    const desc = updates.eligibility || updates.description || program.eligibility || program.description;

    const updated = inMemoryDb.updateProgram(programId, {
      ...updates,
      name: title,
      title,
      description: desc,
      eligibility: desc,
      deadline: updates.deadline ? new Date(updates.deadline).toISOString() : program.deadline,
    });

    return updated!;
  }

  async deleteProgram(
    incubatorId: string,
    programId: string,
    userRole?: string
  ): Promise<{ success: boolean; message: string }> {
    const program = inMemoryDb.getProgramById(programId);
    if (!program) {
      throw new AppError('Program not found', 404, 'NOT_FOUND');
    }

    if (program.incubator_id !== incubatorId && userRole !== 'admin') {
      throw new AppError('Only the owning incubator can delete this program', 403, 'FORBIDDEN_RESOURCE');
    }

    inMemoryDb.deleteProgram(programId);
    return { success: true, message: 'Program deleted successfully' };
  }
}

// ==========================================
// 3. APPLICATION SERVICE
// ==========================================
export class ApplicationService {
  async applyToProgram(
    founderId: string,
    programId: string,
    data: { startup_id: string; pitch_summary?: string | null }
  ): Promise<Application> {
    const program = inMemoryDb.getProgramById(programId);
    if (!program) {
      throw new AppError('Program not found', 404, 'NOT_FOUND');
    }

    // 1. Deadline check: applying after deadline returns 422
    const deadlineTime = new Date(program.deadline).getTime();
    if (deadlineTime < Date.now()) {
      throw new AppError('Program application deadline has passed', 422, 'DEADLINE_PASSED');
    }

    // 2. Startup ownership check
    const startup = inMemoryDb.startups.get(data.startup_id);
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }
    if (startup.founder_id !== founderId) {
      throw new AppError('Startup does not belong to you', 403, 'FORBIDDEN_RESOURCE');
    }

    // 3. Duplicate check: returns 409
    const existingApps = inMemoryDb.listApplications({ programId, startupId: data.startup_id });
    if (existingApps.length > 0) {
      throw new AppError('Startup has already applied to this program', 409, 'DUPLICATE_APPLICATION');
    }

    const app: Application = {
      id: crypto.randomUUID(),
      program_id: programId,
      startup_id: data.startup_id,
      founder_id: founderId,
      pitch_summary: data.pitch_summary || null,
      status: 'submitted',
      decision_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = inMemoryDb.createApplication(app);

    const founder = inMemoryDb.getProfileById(founderId);
    await notify(
      program.incubator_id,
      'application_submitted',
      { application_id: saved.id, program_id: programId, startup_id: data.startup_id },
      'New Program Application',
      `${founder?.full_name || 'A founder'} applied to ${program.name || program.title} with ${startup.name}`
    );

    return saved;
  }

  async listProgramApplications(
    incubatorId: string,
    programId: string,
    userRole?: string
  ): Promise<Array<Application & { startup: Startup | null; founder: Profile | null }>> {
    const program = inMemoryDb.getProgramById(programId);
    if (!program) {
      throw new AppError('Program not found', 404, 'NOT_FOUND');
    }

    if (program.incubator_id !== incubatorId && userRole !== 'admin') {
      throw new AppError('Only the owning incubator can view applications for this program', 403, 'FORBIDDEN_RESOURCE');
    }

    const apps = inMemoryDb.listApplications({ programId });
    return apps.map((a) => ({
      ...a,
      startup: inMemoryDb.startups.get(a.startup_id) || null,
      founder: inMemoryDb.getProfileById(a.founder_id),
    }));
  }

  async listIncubatorApplications(
    incubatorId: string
  ): Promise<
    Array<
      Application & {
        program: IncubatorProgram | null;
        startup: Startup | null;
        founder: Profile | null;
      }
    >
  > {
    const apps = inMemoryDb.listApplications({ incubatorId });
    return apps.map((a) => ({
      ...a,
      program: inMemoryDb.getProgramById(a.program_id),
      startup: inMemoryDb.startups.get(a.startup_id) || null,
      founder: inMemoryDb.getProfileById(a.founder_id),
    }));
  }

  async listFounderApplications(
    founderId: string
  ): Promise<
    Array<
      Application & {
        program: IncubatorProgram | null;
        startup: Startup | null;
      }
    >
  > {
    const apps = inMemoryDb.listApplications({ founderId });
    return apps.map((a) => ({
      ...a,
      program: inMemoryDb.getProgramById(a.program_id),
      startup: inMemoryDb.startups.get(a.startup_id) || null,
    }));
  }

  async updateApplicationStatus(
    incubatorId: string,
    applicationId: string,
    newStatus: ApplicationStatus,
    decisionNotes?: string | null,
    userRole?: string
  ): Promise<Application> {
    const app = inMemoryDb.getApplicationById(applicationId);
    if (!app) {
      throw new AppError('Application not found', 404, 'NOT_FOUND');
    }

    const program = inMemoryDb.getProgramById(app.program_id);
    if (!program) {
      throw new AppError('Program not found', 404, 'NOT_FOUND');
    }

    // Ownership check: only the owning incubator can change statuses
    if (program.incubator_id !== incubatorId && userRole !== 'admin') {
      throw new AppError('Only the owning incubator can change application status', 403, 'FORBIDDEN_RESOURCE');
    }

    // Valid state transitions
    const allowed = APPLICATION_TRANSITIONS[app.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        `Invalid application status transition from ${app.status} to ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updated = inMemoryDb.updateApplication(applicationId, {
      status: newStatus,
      decision_notes: decisionNotes !== undefined ? decisionNotes : app.decision_notes,
    });

    const startup = inMemoryDb.startups.get(app.startup_id);
    await notify(
      app.founder_id,
      'application_status_updated',
      { application_id: applicationId, program_id: program.id, status: newStatus },
      'Application Status Updated',
      `Your application for ${startup?.name || 'your startup'} to ${program.name} is now ${newStatus.replace('_', ' ')}`
    );

    return updated!;
  }
}

// ==========================================
// 4. NOTIFICATION RETRIEVAL SERVICE
// ==========================================
export class NotificationRetrievalService {
  async listNotifications(userId: string): Promise<Notification[]> {
    if (!config.USE_IN_MEMORY_DB) {
      const res = await query<Notification>(
        `SELECT id, user_id, title, message, type, payload, link, read, created_at
         FROM public.notifications
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      return res.rows;
    }
    return inMemoryDb.listNotifications(userId);
  }

  async getUnreadCount(userId: string): Promise<{ count: number; unread_count: number }> {
    if (!config.USE_IN_MEMORY_DB) {
      const res = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM public.notifications WHERE user_id = $1 AND read = false`,
        [userId]
      );
      const count = parseInt(res.rows[0]?.count || '0', 10);
      return { count, unread_count: count };
    }
    const count = inMemoryDb.getUnreadNotificationsCount(userId);
    return { count, unread_count: count };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    if (!config.USE_IN_MEMORY_DB) {
      const checkRes = await query<Notification>(
        `SELECT * FROM public.notifications WHERE id = $1`,
        [notificationId]
      );
      if (checkRes.rows.length === 0) {
        throw new AppError('Notification not found', 404, 'NOT_FOUND');
      }
      if (checkRes.rows[0].user_id !== userId) {
        throw new AppError('Forbidden: notification belongs to another user', 403, 'FORBIDDEN_RESOURCE');
      }
      const updateRes = await query<Notification>(
        `UPDATE public.notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
        [notificationId, userId]
      );
      inMemoryDb.markNotificationAsRead(notificationId, userId);
      const row = updateRes.rows[0];
      return { ...row, read: true, is_read: true };
    }

    const notif = inMemoryDb.notifications.get(notificationId);
    if (!notif) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    if (notif.user_id !== userId) {
      throw new AppError('Forbidden: notification belongs to another user', 403, 'FORBIDDEN_RESOURCE');
    }

    const updated = inMemoryDb.markNotificationAsRead(notificationId, userId);
    return { ...updated!, read: true, is_read: true };
  }

  async markAllAsRead(userId: string): Promise<{ marked_count: number }> {
    if (!config.USE_IN_MEMORY_DB) {
      const updateRes = await query(
        `UPDATE public.notifications SET read = true WHERE user_id = $1 AND read = false`,
        [userId]
      );
      inMemoryDb.markAllNotificationsAsRead(userId);
      return { marked_count: updateRes.rowCount || 0 };
    }
    const count = inMemoryDb.markAllNotificationsAsRead(userId);
    return { marked_count: count };
  }
}

export const mentorshipService = new MentorshipService();
export const incubatorService = new IncubatorService();
export const applicationService = new ApplicationService();
export const notificationRetrievalService = new NotificationRetrievalService();
