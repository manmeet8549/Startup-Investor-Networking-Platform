import crypto from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import type { Profile, VerificationRequest } from '../db/types.js';
import { AppError } from '../middleware/error.middleware.js';
import { generateToken } from '../middleware/auth.middleware.js';
import type { RegisterInput, RegisterProfileInput, LoginInput } from '../schemas/auth.schema.js';
import { config } from '../config.js';

export interface AuthRegistrationResult {
  user: Profile;
  profile: Profile;
  token: string;
  verification_request: VerificationRequest | null;
}

export async function registerProfile(input: RegisterProfileInput): Promise<AuthRegistrationResult> {
  // Explicit security rule: Never allow admin registration
  if ((input.role as string) === 'admin') {
    throw new AppError('Admin registration is not permitted', 403, 'FORBIDDEN');
  }

  // Check if email already registered
  let existing: Profile | null = null;
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Profile>('SELECT * FROM public.profiles WHERE LOWER(email) = LOWER($1) LIMIT 1', [input.email]);
    if (res.rows.length > 0) existing = res.rows[0];
  } else {
    existing = inMemoryDb.getProfileByEmail(input.email);
  }

  if (existing) {
    throw new AppError('Email address is already in use', 409, 'EMAIL_EXISTS');
  }

  const userId = input.user_id || crypto.randomUUID();
  const now = new Date().toISOString();

  // Founders are approved immediately; other roles start as pending
  const isFounder = input.role === 'founder';
  const verificationStatus = isFounder ? 'verified' : 'pending';

  const newProfile: Profile = {
    id: userId,
    email: input.email.toLowerCase(),
    full_name: input.full_name,
    role: input.role,
    is_student: isFounder ? Boolean(input.is_student) : false,
    organization: input.organization ?? null,
    avatar_url: null,
    bio: input.bio ?? null,
    location: input.location ?? null,
    website: input.website && input.website.length > 0 ? input.website : null,
    status: 'active',
    verification_status: verificationStatus,
    created_at: now,
    updated_at: now,
  };

  let savedProfile: Profile;
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const insertSql = `
      INSERT INTO public.profiles (
        id, email, full_name, role, is_student, organization, bio, location, website, status, verification_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const res = await query<Profile>(insertSql, [
      newProfile.id,
      newProfile.email,
      newProfile.full_name,
      newProfile.role,
      newProfile.is_student,
      newProfile.organization,
      newProfile.bio,
      newProfile.location,
      newProfile.website,
      newProfile.status,
      newProfile.verification_status,
      newProfile.created_at,
      newProfile.updated_at,
    ]);
    savedProfile = res.rows[0];
  } else {
    savedProfile = inMemoryDb.saveProfile(newProfile);
  }

  // Initialize role profile
  if (savedProfile.role === 'investor') {
    inMemoryDb.saveInvestorProfile({
      user_id: savedProfile.id,
      investment_thesis: savedProfile.bio,
      ticket_size_min: 0,
      ticket_size_max: 0,
      preferred_sectors: [],
      preferred_stages: [],
      preferred_locations: [],
      created_at: now,
      updated_at: now,
    });
  } else if (savedProfile.role === 'mentor') {
    inMemoryDb.saveMentorProfile({
      user_id: savedProfile.id,
      expertise_areas: [],
      years_of_experience: 0,
      mentoring_topics: [],
      linkedin_url: savedProfile.website,
      created_at: now,
      updated_at: now,
    });
  } else if (savedProfile.role === 'incubator') {
    inMemoryDb.saveIncubatorProfile({
      user_id: savedProfile.id,
      organization_name: savedProfile.organization || savedProfile.full_name,
      website: savedProfile.website,
      program_types: [],
      cohort_size: 0,
      created_at: now,
      updated_at: now,
    });
  }

  let verificationRequest: VerificationRequest | null = null;
  // Create verification request queue item for non-founders
  if (!isFounder) {
    const vReq: VerificationRequest = {
      id: crypto.randomUUID(),
      user_id: savedProfile.id,
      role_requested: savedProfile.role,
      organization: savedProfile.organization,
      supporting_notes: `New registration verification request for ${savedProfile.full_name} (${savedProfile.role}).`,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      admin_notes: null,
      created_at: now,
      updated_at: now,
    };
    verificationRequest = vReq;

    if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
      await query(
        `INSERT INTO public.verification_requests (id, user_id, role_requested, organization, supporting_notes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [vReq.id, vReq.user_id, vReq.role_requested, vReq.organization, vReq.supporting_notes, vReq.status, vReq.created_at, vReq.updated_at]
      );
    } else {
      inMemoryDb.createVerificationRequest(vReq);
    }
  }

  const token = generateToken({
    sub: savedProfile.id,
    email: savedProfile.email,
    role: savedProfile.role,
  });

  return {
    user: savedProfile,
    profile: savedProfile,
    token,
    verification_request: verificationRequest,
  };
}

export async function register(input: RegisterInput): Promise<AuthRegistrationResult> {
  return registerProfile(input as RegisterProfileInput);
}

export async function login(input: LoginInput): Promise<{ user: Profile; token: string }> {
  let profile: Profile | null = null;
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Profile>('SELECT * FROM public.profiles WHERE LOWER(email) = LOWER($1) LIMIT 1', [input.email]);
    if (res.rows.length > 0) profile = res.rows[0];
  } else {
    profile = inMemoryDb.getProfileByEmail(input.email);
  }

  if (!profile) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (profile.status === 'suspended') {
    throw new AppError('This user account has been suspended', 403, 'ACCOUNT_SUSPENDED');
  }

  const token = generateToken({
    sub: profile.id,
    email: profile.email,
    role: profile.role,
  });

  return { user: profile, token };
}
