import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type {
  Profile,
  VerificationRequest,
  UserRole,
  MentorProfile,
  IncubatorProfile,
  AuditLog,
} from './types.js';
import type {
  InvestorProfile,
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
      this.investorProfiles.set(ip.user_id, { ...ip });
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

  saveInvestorProfile(profile: InvestorProfile | any): InvestorProfile {
    const min = profile.ticket_min ?? profile.ticket_size_min;
    const max = profile.ticket_max ?? profile.ticket_size_max;
    // Constraint check: ticket_min <= ticket_max
    if (min !== undefined && max !== undefined && min > max) {
      throw new Error('check_ticket_range: ticket_min must be less than or equal to ticket_max');
    }
    const clone = {
      ...profile,
      ticket_min: min ?? 0,
      ticket_max: max ?? 0,
      updated_at: new Date().toISOString(),
    };
    this.investorProfiles.set(clone.user_id, clone);
    this.invalidateMatchesForInvestor(clone.user_id);
    return { ...clone };
  }

  // --- Investor Matching & Preferences ---
  listVerifiedInvestors(): Array<{ profile: Profile; investorProfile: InvestorProfile }> {
    const results: Array<{ profile: Profile; investorProfile: InvestorProfile }> = [];
    for (const [id, p] of this.profiles.entries()) {
      if (
        p.role === 'investor' &&
        p.status !== 'suspended' &&
        ((p.verification_status as string) === 'verified' || (p.verification_status as string) === 'approved')
      ) {
        const ip = this.investorProfiles.get(id) || {
          user_id: id,
          firm_name: p.organization || p.full_name,
          sectors: [],
          stages: [],
          ticket_min: 0,
          ticket_max: 0,
          regions: [],
          business_models: [],
          thesis: p.bio,
          accredited: true,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
        results.push({ profile: { ...p }, investorProfile: { ...ip } });
      }
    }
    return results;
  }

  saveMatchScore(score: MatchScore): MatchScore {
    const key = `${score.investor_id}:${score.startup_id}`;
    const clone = { ...score, updated_at: new Date().toISOString() };
    this.matchScores.set(key, clone);
    return { ...clone };
  }

  getCachedMatchScore(investorId: string, startupId: string): MatchScore | null {
    const key = `${investorId}:${startupId}`;
    const score = this.matchScores.get(key);
    return score ? { ...score } : null;
  }

  invalidateMatchesForInvestor(investorId: string): void {
    for (const [key, s] of this.matchScores.entries()) {
      if (s.investor_id === investorId) {
        this.matchScores.delete(key);
      }
    }
  }

  invalidateMatchesForStartup(startupId: string): void {
    for (const [key, s] of this.matchScores.entries()) {
      if (s.startup_id === startupId) {
        this.matchScores.delete(key);
      }
    }
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

  getStartupAccessStatus(userId: string, startupId: string): 'none' | 'pending' | 'approved' | 'rejected' {
    const requests = Array.from(this.documentAccessRequests.values()).filter(
      (r) => r.startup_id === startupId && r.requester_id === userId
    );
    if (requests.some((r) => r.status === 'approved')) return 'approved';
    if (requests.some((r) => r.status === 'pending')) return 'pending';
    if (requests.some((r) => r.status === 'rejected')) return 'rejected';
    return 'none';
  }

  listStartupsWithFilters(options: {
    q?: string;
    sectors?: string[];
    stage?: string;
    location?: string;
    funding_min?: number;
    funding_max?: number;
    business_model?: string;
    sort?: 'newest' | 'funding' | 'relevance';
    page?: number;
    limit?: number;
    user?: Profile;
  }): { items: any[]; total: number; page: number; limit: number; total_pages: number } {
    let list = Array.from(this.startups.values());

    // 1. Exclude hidden startups (admin moderation)
    list = list.filter((s) => s.is_hidden !== true);

    // 2. Exclude startups whose founder is suspended or unverified
    list = list.filter((s) => {
      const founder = this.getProfileById(s.founder_id);
      if (!founder) return false;
      if (founder.status === 'suspended') return false;
      return founder.verification_status === 'verified' || (founder.verification_status as string) === 'approved';
    });

    // 3. Exclude private startups from public discovery listings
    list = list.filter((s) => s.visibility !== 'private');

    // 4. Role & Auth visibility rules:
    // Unauthenticated or unverified users get only public startups
    const isVerifiedUser =
      options.user &&
      (options.user.role === 'admin' ||
        options.user.verification_status === 'verified' ||
        (options.user.verification_status as string) === 'approved');

    if (!isVerifiedUser) {
      list = list.filter((s) => s.visibility === 'public');
    }

    // 5. Query filters:
    // Multi-sector filter
    if (options.sectors && options.sectors.length > 0) {
      const reqSectors = options.sectors.map((sec) => sec.toLowerCase());
      list = list.filter((s) => {
        const sSectors = (s.sectors && s.sectors.length > 0 ? s.sectors : [s.sector]).map((x) =>
          x.toLowerCase()
        );
        return reqSectors.some((sec) => sSectors.includes(sec));
      });
    }

    // Stage filter
    if (options.stage) {
      const stg = options.stage.toLowerCase();
      list = list.filter((s) => s.stage.toLowerCase() === stg);
    }

    // Location filter
    if (options.location) {
      const loc = options.location.toLowerCase();
      list = list.filter((s) => s.location && s.location.toLowerCase().includes(loc));
    }

    // Funding range
    if (options.funding_min !== undefined) {
      list = list.filter((s) => s.funding_ask >= options.funding_min!);
    }
    if (options.funding_max !== undefined) {
      list = list.filter((s) => s.funding_ask <= options.funding_max!);
    }

    // Business model
    if (options.business_model) {
      const bm = options.business_model.toLowerCase();
      list = list.filter((s) => s.business_model && s.business_model.toLowerCase().includes(bm));
    }

    // Full-text search (q) - handles any SQL injection string safely
    const relevanceMap = new Map<string, number>();
    if (options.q && options.q.trim()) {
      const rawTerms = options.q.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter((s) => {
        let score = 0;
        const name = s.name.toLowerCase();
        const tagline = s.tagline.toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const prob = (s.problem || '').toLowerCase();
        const sol = (s.solution || '').toLowerCase();
        const loc = (s.location || '').toLowerCase();
        const bm = (s.business_model || '').toLowerCase();
        const sectorsStr = (s.sectors || [s.sector]).join(' ').toLowerCase();

        for (const term of rawTerms) {
          if (name.includes(term)) score += 10;
          if (tagline.includes(term)) score += 5;
          if (sectorsStr.includes(term)) score += 3;
          if (desc.includes(term)) score += 2;
          if (prob.includes(term)) score += 2;
          if (sol.includes(term)) score += 2;
          if (bm.includes(term)) score += 2;
          if (loc.includes(term)) score += 1;
        }

        if (score > 0) {
          relevanceMap.set(s.id, score);
          return true;
        }
        return false;
      });
    }

    // 6. Sorting
    const sort = options.sort || (options.q ? 'relevance' : 'newest');
    list.sort((a, b) => {
      if (sort === 'relevance' && options.q) {
        const relA = relevanceMap.get(a.id) || 0;
        const relB = relevanceMap.get(b.id) || 0;
        if (relB !== relA) return relB - relA;
      }
      if (sort === 'funding') {
        return b.funding_ask - a.funding_ask;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const total = list.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const total_pages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    // 7. Sanitize sensitive fields based on access
    const mapped = paginated.map((s) => {
      let hasAccess = false;
      let accessStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none';

      if (s.visibility === 'public') {
        hasAccess = true;
        accessStatus = 'approved';
      } else if (options.user) {
        if (options.user.role === 'admin' || s.founder_id === options.user.id) {
          hasAccess = true;
          accessStatus = 'approved';
        } else {
          accessStatus = this.getStartupAccessStatus(options.user.id, s.id);
          hasAccess = accessStatus === 'approved';
        }
      }

      if (!hasAccess) {
        // Redact sensitive fields
        const { problem, solution, target_market, business_model, ...rest } = s;
        return {
          ...rest,
          problem: null,
          solution: null,
          target_market: null,
          business_model: null,
          has_access: false,
          access_status: accessStatus,
          profile_completeness: s.profile_completeness,
        };
      }

      return {
        ...s,
        has_access: true,
        access_status: 'approved',
        profile_completeness: s.profile_completeness,
      };
    });

    return {
      items: mapped,
      total,
      page,
      limit,
      total_pages,
    };
  }

  getDistinctSectors(): { sector: string; count: number }[] {
    const counts = new Map<string, number>();
    const standardSectors = [
      'AgriTech',
      'Climate Tech',
      'HealthTech',
      'EdTech',
      'FinTech',
      'Clean Energy',
      'AI',
      'SaaS',
      'B2B',
      'Consumer',
      'DeepTech',
      'Hardware',
    ];
    for (const sec of standardSectors) counts.set(sec, 0);

    for (const s of this.startups.values()) {
      if (s.is_hidden || s.visibility === 'private') continue;
      const allSecs = s.sectors && s.sectors.length > 0 ? s.sectors : [s.sector];
      for (const sec of allSecs) {
        counts.set(sec, (counts.get(sec) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));
  }

  getDistinctStages(): { stage: string; label: string; count: number }[] {
    const stages: { stage: string; label: string }[] = [
      { stage: 'idea', label: 'Idea' },
      { stage: 'validation', label: 'Validation' },
      { stage: 'mvp', label: 'MVP' },
      { stage: 'early_traction', label: 'Early traction' },
      { stage: 'growth', label: 'Growth' },
    ];
    const counts = new Map<string, number>();
    for (const s of stages) counts.set(s.stage, 0);

    for (const s of this.startups.values()) {
      if (s.is_hidden || s.visibility === 'private') continue;
      counts.set(s.stage, (counts.get(s.stage) || 0) + 1);
    }

    return stages.map((st) => ({
      stage: st.stage,
      label: st.label,
      count: counts.get(st.stage) || 0,
    }));
  }

  getDistinctLocations(): { location: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const s of this.startups.values()) {
      if (s.is_hidden || s.visibility === 'private' || !s.location) continue;
      const loc = s.location.trim();
      counts.set(loc, (counts.get(loc) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
  }

  seedManyStartups(count: number = 500): Startup[] {
    const sectorsList = ['AgriTech', 'Climate Tech', 'HealthTech', 'EdTech', 'FinTech', 'Clean Energy', 'AI', 'SaaS'];
    const stagesList = ['idea', 'validation', 'mvp', 'early_traction', 'growth'] as const;
    const locationsList = [
      'Ludhiana, Punjab',
      'Chandigarh',
      'Bengaluru, Karnataka',
      'Delhi NCR',
      'Mumbai, Maharashtra',
      'Hyderabad, Telangana',
      'Pune, Maharashtra',
      'Jaipur, Rajasthan',
    ];
    const visibilityList = ['public', 'access_controlled'] as const;

    const created: Startup[] = [];
    const founderId = 'f0000000-0000-0000-0000-000000000001';

    for (let i = 1; i <= count; i++) {
      const sec = sectorsList[i % sectorsList.length];
      const stg = stagesList[i % stagesList.length];
      const loc = locationsList[i % locationsList.length];
      const vis = visibilityList[i % visibilityList.length];
      const ask = ((i % 20) + 1) * 500000;

      const startup: Startup = {
        id: `s-benchmark-${i.toString().padStart(4, '0')}`,
        founder_id: founderId,
        name: `Benchmark Venture ${i}`,
        tagline: `Innovative solutions in ${sec} powering next-gen growth`,
        description: `Comprehensive ${sec} platform solving critical industry bottlenecks in ${loc}.`,
        sector: sec,
        sectors: [sec],
        stage: stg,
        location: loc,
        funding_ask: ask,
        currency: 'INR',
        visibility: vis,
        problem: `Industry challenges in ${sec} requiring automated efficiency.`,
        solution: `Scalable ${stg} product reducing costs by 35%.`,
        target_market: `Market segment ${i} in ${loc}.`,
        business_model: 'Subscription B2B SaaS',
        pitch_deck_url: null,
        website: `https://benchmark${i}.example.com`,
        is_hidden: false,
        profile_completeness: 100,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
        updated_at: new Date(Date.now() - i * 60000).toISOString(),
      };

      this.startups.set(startup.id, startup);
      created.push(startup);
    }

    return created;
  }

  listStartupsByFounder(founderId: string): Startup[] {
    return Array.from(this.startups.values()).filter((s) => s.founder_id === founderId);
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

  updateStartup(id: string, updates: Partial<Startup>): Startup | null {
    const existing = this.startups.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.startups.set(id, updated);
    this.invalidateMatchesForStartup(id);
    return { ...updated };
  }

  deleteStartup(id: string): boolean {
    this.invalidateMatchesForStartup(id);
    return this.startups.delete(id);
  }

  // --- Startup Team Members ---
  createTeamMember(member: StartupTeamMember): StartupTeamMember {
    const clone = {
      ...member,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.startupTeamMembers.set(clone.id, clone);
    return { ...clone };
  }

  listTeamMembers(startupId: string): StartupTeamMember[] {
    return Array.from(this.startupTeamMembers.values()).filter(
      (m) => m.startup_id === startupId
    );
  }

  getTeamMemberById(id: string): StartupTeamMember | null {
    const member = this.startupTeamMembers.get(id);
    return member ? { ...member } : null;
  }

  updateTeamMember(id: string, updates: Partial<StartupTeamMember>): StartupTeamMember | null {
    const existing = this.startupTeamMembers.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.startupTeamMembers.set(id, updated);
    return { ...updated };
  }

  deleteTeamMember(id: string): boolean {
    return this.startupTeamMembers.delete(id);
  }

  // --- Documents ---
  createDocument(doc: Document): Document {
    const clone = {
      ...doc,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.documents.set(clone.id, clone);
    return { ...clone };
  }

  getDocumentById(id: string): Document | null {
    const doc = this.documents.get(id);
    return doc ? { ...doc } : null;
  }

  listDocumentsByStartup(startupId: string): Document[] {
    return Array.from(this.documents.values()).filter(
      (d) => d.startup_id === startupId
    );
  }

  deleteDocument(id: string): boolean {
    return this.documents.delete(id);
  }

  getMaxDocumentVersion(startupId: string): number {
    const docs = this.listDocumentsByStartup(startupId);
    if (docs.length === 0) return 0;
    return Math.max(...docs.map((d) => d.version || 1));
  }

  // --- Document Access Requests ---
  createDocumentAccessRequest(req: DocumentAccessRequest): DocumentAccessRequest {
    for (const existing of this.documentAccessRequests.values()) {
      if (existing.document_id === req.document_id && existing.requester_id === req.requester_id) {
        throw new Error('unique_document_access_request: access request already exists for this document and user');
      }
    }
    const clone = {
      ...req,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.documentAccessRequests.set(clone.id, clone);
    return { ...clone };
  }

  getDocumentAccessRequestById(id: string): DocumentAccessRequest | null {
    const req = this.documentAccessRequests.get(id);
    return req ? { ...req } : null;
  }

  findDocumentAccessRequest(documentId: string, requesterId: string): DocumentAccessRequest | null {
    for (const req of this.documentAccessRequests.values()) {
      if (req.document_id === documentId && req.requester_id === requesterId) {
        return { ...req };
      }
    }
    return null;
  }

  listDocumentAccessRequestsByStartup(startupId: string): DocumentAccessRequest[] {
    return Array.from(this.documentAccessRequests.values()).filter(
      (r) => r.startup_id === startupId
    );
  }

  updateDocumentAccessRequest(id: string, updates: Partial<DocumentAccessRequest>): DocumentAccessRequest | null {
    const existing = this.documentAccessRequests.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.documentAccessRequests.set(id, updated);
    return { ...updated };
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
