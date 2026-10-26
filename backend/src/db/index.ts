import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type {
  Profile,
  VerificationRequest,
  UserRole,
  InvestorProfile,
  MentorProfile,
  IncubatorProfile,
  AuditLog,
} from './types.js';
import type {
  FounderProfile,
  Startup,
  StartupTeamMember,
  Document,
  DocumentAccessRequest,
  WatchlistEntry,
  InvestorNote,
  InvestorStartupStatus,
  PitchRequest,
  Connection,
  Message,
  MentorshipRequest,
  MentorFeedback,
  IncubatorProgram,
  Application,
  Notification,
  MatchScore,
  Report,
} from './schema.types.js';
import {
  seedProfiles,
  seedFounderProfiles,
  seedInvestorProfiles,
  seedMentorProfiles,
  seedIncubatorProfiles,
  seedStartups,
  seedIncubatorPrograms,
  seedApplications,
  seedDocuments,
  seedWatchlist,
  seedInvestorNotes,
  seedMessages,
} from './seed-data.js';

const { Pool } = pg;

const initialVerificationRequests: VerificationRequest[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    user_id: 'i0000000-0000-0000-0000-000000000001',
    role_requested: 'investor',
    organization: 'Northstar Ventures',
    supporting_notes: 'Seed fund managing ₹50Cr active portfolio in India.',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    admin_notes: null,
    created_at: new Date('2026-10-25T11:00:00Z').toISOString(),
    updated_at: new Date('2026-10-25T11:00:00Z').toISOString(),
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    user_id: 'm0000000-0000-0000-0000-000000000001',
    role_requested: 'mentor',
    organization: 'Independent Advisor',
    supporting_notes: '12 years experience mentoring climate and biotech founders.',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    admin_notes: null,
    created_at: new Date('2026-10-24T12:00:00Z').toISOString(),
    updated_at: new Date('2026-10-24T12:00:00Z').toISOString(),
  },
];

// In-Memory Database for fast, deterministic testing and disconnected operation
class InMemoryDatabase {
  profiles: Map<string, Profile> = new Map();
  verificationRequests: Map<string, VerificationRequest> = new Map();
  founderProfiles: Map<string, FounderProfile> = new Map();
  investorProfiles: Map<string, InvestorProfile> = new Map();
  mentorProfiles: Map<string, MentorProfile> = new Map();
  incubatorProfiles: Map<string, IncubatorProfile> = new Map();
  startups: Map<string, Startup> = new Map();
  startupTeamMembers: Map<string, StartupTeamMember> = new Map();
  documents: Map<string, Document> = new Map();
  documentAccessRequests: Map<string, DocumentAccessRequest> = new Map();
  watchlist: Map<string, WatchlistEntry> = new Map();
  investorNotes: Map<string, InvestorNote> = new Map();
  investorStartupStatus: Map<string, InvestorStartupStatus> = new Map();
  pitchRequests: Map<string, PitchRequest> = new Map();
  connections: Map<string, Connection> = new Map();
  messages: Map<string, Message> = new Map();
  mentorshipRequests: Map<string, MentorshipRequest> = new Map();
  mentorFeedback: Map<string, MentorFeedback> = new Map();
  incubatorPrograms: Map<string, IncubatorProgram> = new Map();
  applications: Map<string, Application> = new Map();
  notifications: Map<string, Notification> = new Map();
  matchScores: Map<string, MatchScore> = new Map();
  reports: Map<string, Report> = new Map();
  auditLogs: AuditLog[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.profiles.clear();
    this.verificationRequests.clear();
    this.founderProfiles.clear();
    this.investorProfiles.clear();
    this.mentorProfiles.clear();
    this.incubatorProfiles.clear();
    this.startups.clear();
    this.startupTeamMembers.clear();
    this.documents.clear();
    this.documentAccessRequests.clear();
    this.watchlist.clear();
    this.investorNotes.clear();
    this.investorStartupStatus.clear();
    this.pitchRequests.clear();
    this.connections.clear();
    this.messages.clear();
    this.mentorshipRequests.clear();
    this.mentorFeedback.clear();
    this.incubatorPrograms.clear();
    this.applications.clear();
    this.notifications.clear();
    this.matchScores.clear();
    this.reports.clear();
    this.auditLogs = [];

    // Seed canonical profiles
    for (const p of seedProfiles) {
      this.profiles.set(p.id, { ...p, status: p.status as any, verification_status: p.verification_status as any });
    }

    // Seed role profiles
    for (const fp of seedFounderProfiles) {
      this.founderProfiles.set(fp.user_id, { ...fp });
    }
    for (const ip of seedInvestorProfiles) {
      this.investorProfiles.set(ip.user_id, {
        user_id: ip.user_id,
        investment_thesis: ip.thesis || null,
        ticket_size_min: ip.ticket_min,
        ticket_size_max: ip.ticket_max,
        preferred_sectors: ip.sectors,
        preferred_stages: ip.stages,
        preferred_locations: ip.regions,
        created_at: ip.created_at,
        updated_at: ip.updated_at,
      });
    }
    for (const mp of seedMentorProfiles) {
      this.mentorProfiles.set(mp.user_id, {
        user_id: mp.user_id,
        expertise_areas: mp.expertise,
        years_of_experience: mp.experience,
        mentoring_topics: ['Strategy', 'Pricing'],
        linkedin_url: mp.linkedin_url || null,
        created_at: mp.created_at,
        updated_at: mp.updated_at,
      });
    }
    for (const cp of seedIncubatorProfiles) {
      this.incubatorProfiles.set(cp.user_id, {
        user_id: cp.user_id,
        organization_name: cp.organization_name || null,
        website: cp.website || null,
        program_types: cp.focus_sectors,
        cohort_size: cp.cohort_size,
        created_at: cp.created_at,
        updated_at: cp.updated_at,
      });
    }

    // Seed startups
    for (const s of seedStartups) {
      this.startups.set(s.id, { ...s });
    }

    // Seed incubator programs
    for (const p of seedIncubatorPrograms) {
      this.incubatorPrograms.set(p.id, { ...p });
    }

    // Seed applications
    for (const a of seedApplications) {
      this.applications.set(a.id, { ...a });
    }

    // Seed documents
    for (const d of seedDocuments) {
      this.documents.set(d.id, { ...d });
    }

    // Seed watchlist
    for (const w of seedWatchlist) {
      this.watchlist.set(w.id, { ...w });
    }

    // Seed investor notes
    for (const n of seedInvestorNotes) {
      this.investorNotes.set(n.id, { ...n });
    }

    // Seed messages
    for (const m of seedMessages) {
      this.messages.set(m.id, { ...m });
    }

    // Seed verification requests
    for (const v of initialVerificationRequests) {
      this.verificationRequests.set(v.id, { ...v });
    }
  }

  // --- Profile methods ---
  getProfileById(id: string): Profile | null {
    const profile = this.profiles.get(id);
    return profile ? { ...profile } : null;
  }

  getProfileByEmail(email: string): Profile | null {
    for (const profile of this.profiles.values()) {
      if (profile.email.toLowerCase() === email.toLowerCase()) {
        return { ...profile };
      }
    }
    return null;
  }

  saveProfile(profile: Profile): Profile {
    const clone = { ...profile, updated_at: new Date().toISOString() };
    this.profiles.set(clone.id, clone);
    return { ...clone };
  }

  listProfiles(options: {
    page: number;
    limit: number;
    search?: string;
    role?: UserRole;
    status?: string;
  }): { profiles: Profile[]; total: number } {
    let list = Array.from(this.profiles.values());

    if (options.role) {
      list = list.filter((p) => p.role === options.role);
    }
    if (options.status) {
      list = list.filter((p) => p.status === options.status);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.organization && p.organization.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    const startIndex = (options.page - 1) * options.limit;
    const paginated = list.slice(startIndex, startIndex + options.limit);
    return { profiles: paginated, total };
  }

  // --- Verification Request methods ---
  createVerificationRequest(req: VerificationRequest): VerificationRequest {
    const clone = { ...req, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this.verificationRequests.set(clone.id, clone);
    return { ...clone };
  }

  listVerificationRequests(options: {
    page: number;
    limit: number;
    role?: UserRole;
    status?: string;
  }): { requests: VerificationRequest[]; total: number } {
    let list = Array.from(this.verificationRequests.values());
    if (options.status) {
      list = list.filter((v) => v.status === options.status);
    }
    if (options.role) {
      list = list.filter((v) => v.role_requested === options.role);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = list.length;
    const startIndex = (options.page - 1) * options.limit;
    return { requests: list.slice(startIndex, startIndex + options.limit), total };
  }

  getVerificationRequestById(id: string): VerificationRequest | null {
    const req = this.verificationRequests.get(id);
    return req ? { ...req } : null;
  }

  updateVerificationRequest(req: VerificationRequest): VerificationRequest {
    const clone = { ...req, updated_at: new Date().toISOString() };
    this.verificationRequests.set(clone.id, clone);
    return { ...clone };
  }

  // --- Role Profiles ---
  getInvestorProfile(userId: string): InvestorProfile | null {
    const inv = this.investorProfiles.get(userId);
    return inv ? { ...inv } : null;
  }

  saveInvestorProfile(profile: InvestorProfile): InvestorProfile {
    // Constraint check: ticket_size_min <= ticket_size_max
    if (
      profile.ticket_size_min !== undefined &&
      profile.ticket_size_max !== undefined &&
      profile.ticket_size_min > profile.ticket_size_max
    ) {
      throw new Error('check_ticket_range: ticket_min must be less than or equal to ticket_max');
    }
    const clone = { ...profile, updated_at: new Date().toISOString() };
    this.investorProfiles.set(clone.user_id, clone);
    return { ...clone };
  }

  getMentorProfile(userId: string): MentorProfile | null {
    const men = this.mentorProfiles.get(userId);
    return men ? { ...men } : null;
  }

  saveMentorProfile(profile: MentorProfile): MentorProfile {
    const clone = { ...profile, updated_at: new Date().toISOString() };
    this.mentorProfiles.set(clone.user_id, clone);
    return { ...clone };
  }

  getIncubatorProfile(userId: string): IncubatorProfile | null {
    const inc = this.incubatorProfiles.get(userId);
    return inc ? { ...inc } : null;
  }

  saveIncubatorProfile(profile: IncubatorProfile): IncubatorProfile {
    const clone = { ...profile, updated_at: new Date().toISOString() };
    this.incubatorProfiles.set(clone.user_id, clone);
    return { ...clone };
  }

  // --- Startups ---
  createStartup(startup: Startup): Startup {
    const clone = { ...startup, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this.startups.set(clone.id, clone);
    return { ...clone };
  }

  getStartupById(id: string): Startup | null {
    const s = this.startups.get(id);
    return s ? { ...s } : null;
  }

  listStartups(options?: {
    visibility?: string[];
    sector?: string;
    stage?: string;
    search?: string;
  }): Startup[] {
    let list = Array.from(this.startups.values());
    if (options?.visibility) {
      list = list.filter((s) => options.visibility!.includes(s.visibility));
    }
    if (options?.sector && options.sector !== 'All sectors') {
      list = list.filter((s) => s.sector === options.sector);
    }
    if (options?.stage && options.stage !== 'All stages') {
      list = list.filter((s) => s.stage === options.stage);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.tagline.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
      );
    }
    return list;
  }

  // --- Applications with uniqueness constraint ---
  createApplication(app: Application): Application {
    // Constraint check: one application per startup per program
    for (const existing of this.applications.values()) {
      if (existing.program_id === app.program_id && existing.startup_id === app.startup_id) {
        throw new Error('unique_program_startup_application: duplicate application for this program and startup');
      }
    }
    const clone = { ...app, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this.applications.set(clone.id, clone);
    return { ...clone };
  }

  // --- Watchlist with uniqueness constraint ---
  addToWatchlist(entry: WatchlistEntry): WatchlistEntry {
    for (const existing of this.watchlist.values()) {
      if (existing.investor_id === entry.investor_id && existing.startup_id === entry.startup_id) {
        throw new Error('unique_watchlist_entry: startup is already in watchlist');
      }
    }
    const clone = { ...entry, created_at: new Date().toISOString() };
    this.watchlist.set(clone.id, clone);
    return { ...clone };
  }

  // --- Investor Notes ---
  saveInvestorNote(note: InvestorNote): InvestorNote {
    const clone = { ...note, updated_at: new Date().toISOString() };
    this.investorNotes.set(clone.id, clone);
    return { ...clone };
  }

  // --- Messages with distinct user constraint ---
  sendMessage(msg: Message): Message {
    if (msg.sender_id === msg.recipient_id) {
      throw new Error('check_messages_distinct_users: sender and recipient must be distinct');
    }
    const clone = { ...msg, created_at: new Date().toISOString() };
    this.messages.set(clone.id, clone);
    return { ...clone };
  }

  // --- Mentor Feedback with rating constraint ---
  addMentorFeedback(fb: MentorFeedback): MentorFeedback {
    if (fb.rating < 1 || fb.rating > 5) {
      throw new Error('check_rating_range: rating must be between 1 and 5');
    }
    const clone = { ...fb, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this.mentorFeedback.set(clone.id, clone);
    return { ...clone };
  }

  // --- RLS Evaluation Helpers ---
  canReadStartup(userId: string, startup: Startup, userRole?: string): boolean {
    if (userRole === 'admin') return true;
    if (startup.founder_id === userId) return true;
    if (startup.visibility === 'public' || startup.visibility === 'access_controlled') return true;
    return false; // Private startup cannot be read by another user
  }

  canReadInvestorNote(userId: string, note: InvestorNote, userRole?: string): boolean {
    if (userRole === 'admin') return true;
    return note.investor_id === userId; // Private to owner
  }

  canReadMessage(userId: string, message: Message, userRole?: string): boolean {
    if (userRole === 'admin') return true;
    return message.sender_id === userId || message.recipient_id === userId; // Participants only
  }

  canReadWatchlist(userId: string, entry: WatchlistEntry, userRole?: string): boolean {
    if (userRole === 'admin') return true;
    return entry.investor_id === userId; // Private to owner
  }

  // --- Audit Logs ---
  createAuditLog(log: AuditLog): AuditLog {
    const clone = { ...log, created_at: new Date().toISOString() };
    this.auditLogs.unshift(clone);
    return { ...clone };
  }

  listAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }
}

export const inMemoryDb = new InMemoryDatabase();

let pgPool: pg.Pool | null = null;

if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
  pgPool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  pgPool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle pg client');
  });
}

/**
 * Execute a parameterized query with fallback to in-memory store in test / local setup.
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  if (pgPool) {
    const start = Date.now();
    const res = await pgPool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rows: res.rowCount }, 'Executed DB query');
    return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
  }

  // If running in in-memory mode, log and return empty structure if raw query isn't mapped
  logger.debug({ text, params }, 'In-memory DB query called');
  return { rows: [], rowCount: 0 };
}

export async function closeDb(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
  }
}
