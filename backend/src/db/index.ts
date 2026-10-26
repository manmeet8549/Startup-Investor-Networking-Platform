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

const { Pool } = pg;

// Seed data matching the prototype users for initial development and testing
const initialProfiles: Profile[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    email: 'manmeet@foundersden.test',
    full_name: 'Manmeet Singh',
    role: 'founder',
    is_student: true,
    organization: 'FarmSense',
    avatar_url: null,
    bio: 'Building FarmSense: Practical intelligence for every farmer.',
    location: 'Ludhiana, India',
    website: 'https://farmsense.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: new Date('2026-10-18T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-18T10:00:00Z').toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    email: 'riya@foundersden.test',
    full_name: 'Riya Kapoor',
    role: 'founder',
    is_student: false,
    organization: 'Medora AI',
    avatar_url: null,
    bio: 'Medora AI: Earlier signals. Better healthcare outcomes.',
    location: 'Delhi, India',
    website: 'https://medora.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: new Date('2026-10-11T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-11T10:00:00Z').toISOString(),
  },
  {
    id: 'i0000000-0000-0000-0000-000000000001',
    email: 'northstar@foundersden.test',
    full_name: 'Northstar Ventures',
    role: 'investor',
    is_student: false,
    organization: 'Northstar Ventures',
    avatar_url: null,
    bio: 'Early-stage investor focused on AgriTech, Climate Tech, and applied AI.',
    location: 'India',
    website: 'https://northstar.example.com',
    status: 'active',
    verification_status: 'pending',
    created_at: new Date('2026-10-25T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-25T10:00:00Z').toISOString(),
  },
  {
    id: 'm0000000-0000-0000-0000-000000000001',
    email: 'kavita@foundersden.test',
    full_name: 'Dr. Kavita Mehra',
    role: 'mentor',
    is_student: false,
    organization: 'Independent Advisor',
    avatar_url: null,
    bio: 'Startup strategy, Go-to-market and deep science mentoring.',
    location: 'Chandigarh, India',
    website: 'https://kavita.example.com',
    status: 'active',
    verification_status: 'pending',
    created_at: new Date('2026-10-24T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-24T10:00:00Z').toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    email: 'punjab@foundersden.test',
    full_name: 'Punjab Innovation Hub',
    role: 'incubator',
    is_student: false,
    organization: 'Punjab Innovation Hub',
    avatar_url: null,
    bio: 'Regional incubator backing campus innovators and early startups.',
    location: 'Punjab, India',
    website: 'https://punjabinnovation.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: new Date('2026-10-12T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-12T10:00:00Z').toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@foundersden.test',
    full_name: 'Platform Admin',
    role: 'admin',
    is_student: false,
    organization: 'Founders Den Core',
    avatar_url: null,
    bio: 'Platform administration and ecosystem moderation.',
    location: 'Global',
    website: null,
    status: 'active',
    verification_status: 'verified',
    created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-01T10:00:00Z').toISOString(),
  },
];

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
  investorProfiles: Map<string, InvestorProfile> = new Map();
  mentorProfiles: Map<string, MentorProfile> = new Map();
  incubatorProfiles: Map<string, IncubatorProfile> = new Map();
  auditLogs: AuditLog[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.profiles.clear();
    this.verificationRequests.clear();
    this.investorProfiles.clear();
    this.mentorProfiles.clear();
    this.incubatorProfiles.clear();
    this.auditLogs = [];

    for (const p of initialProfiles) {
      this.profiles.set(p.id, { ...p });
    }
    for (const v of initialVerificationRequests) {
      this.verificationRequests.set(v.id, { ...v });
    }

    // Seed role profiles for initial users
    this.investorProfiles.set('i0000000-0000-0000-0000-000000000001', {
      user_id: 'i0000000-0000-0000-0000-000000000001',
      investment_thesis: 'Early-stage climate, agriculture, and applied AI in India.',
      ticket_size_min: 1000000,
      ticket_size_max: 5000000,
      preferred_sectors: ['AgriTech', 'Climate Tech', 'AI'],
      preferred_stages: ['Pre-seed', 'Seed'],
      preferred_locations: ['India'],
      created_at: new Date('2026-10-25T10:00:00Z').toISOString(),
      updated_at: new Date('2026-10-25T10:00:00Z').toISOString(),
    });

    this.mentorProfiles.set('m0000000-0000-0000-0000-000000000001', {
      user_id: 'm0000000-0000-0000-0000-000000000001',
      expertise_areas: ['Startup strategy', 'Go-to-market', 'Deep science'],
      years_of_experience: 12,
      mentoring_topics: ['Pricing model', 'Pilot planning', 'Fundraising prep'],
      linkedin_url: 'https://linkedin.com/in/kavitamehra-demo',
      created_at: new Date('2026-10-24T10:00:00Z').toISOString(),
      updated_at: new Date('2026-10-24T10:00:00Z').toISOString(),
    });

    this.incubatorProfiles.set('c0000000-0000-0000-0000-000000000001', {
      user_id: 'c0000000-0000-0000-0000-000000000001',
      organization_name: 'Punjab Innovation Hub',
      website: 'https://punjabinnovation.example.com',
      program_types: ['Campus Fellowship', 'Pre-incubation', 'Prototype Grants'],
      cohort_size: 25,
      created_at: new Date('2026-10-12T10:00:00Z').toISOString(),
      updated_at: new Date('2026-10-12T10:00:00Z').toISOString(),
    });
  }

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

  getInvestorProfile(userId: string): InvestorProfile | null {
    const inv = this.investorProfiles.get(userId);
    return inv ? { ...inv } : null;
  }

  saveInvestorProfile(profile: InvestorProfile): InvestorProfile {
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
