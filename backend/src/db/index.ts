import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { Profile, VerificationRequest, UserRole } from './types.js';

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

  constructor() {
    this.reset();
  }

  reset() {
    this.profiles.clear();
    this.verificationRequests.clear();
    for (const p of initialProfiles) {
      this.profiles.set(p.id, { ...p });
    }
    for (const v of initialVerificationRequests) {
      this.verificationRequests.set(v.id, { ...v });
    }
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
    status?: string;
  }): { requests: VerificationRequest[]; total: number } {
    let list = Array.from(this.verificationRequests.values());
    if (options.status) {
      list = list.filter((v) => v.status === options.status);
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
