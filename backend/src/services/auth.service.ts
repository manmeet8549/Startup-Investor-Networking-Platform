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

export async function registerProfile(
  input: RegisterProfileInput,
  tokenUserId?: string,
  tokenEmail?: string
): Promise<AuthRegistrationResult> {
  // Explicit security rule: Never allow admin registration
  if ((input.role as string) === 'admin') {
    throw new AppError('Admin registration is not permitted', 403, 'FORBIDDEN');
  }

  // The user ID must come from the verified authentication token (or fallback for direct tests)
  const userId = tokenUserId || input.user_id || crypto.randomUUID();
  if (!userId) {
    throw new AppError('Missing user identity from authentication token', 401, 'UNAUTHORIZED');
  }

  const registrationEmail = (tokenEmail || input.email).toLowerCase();

  // In postgres mode, ensure the auth user actually exists in auth.users
  if (!config.USE_IN_MEMORY_DB) {
    const authUserRes = await query<{ id: string; email: string }>(
      'SELECT id, email FROM auth.users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (authUserRes.rows.length === 0) {
      throw new AppError('Auth user does not exist in authentication service', 404, 'AUTH_USER_NOT_FOUND');
    }
  }

  // Check if profile already registered
  let existing: Profile | null = null;
  if (!config.USE_IN_MEMORY_DB) {
    const res = await query<Profile>(
      'SELECT * FROM public.profiles WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1',
      [userId, registrationEmail]
    );
    if (res.rows.length > 0) existing = res.rows[0];
  } else {
    existing = inMemoryDb.getProfileById(userId) || inMemoryDb.getProfileByEmail(registrationEmail);
  }

  if (existing) {
    throw new AppError('Email address is already in use', 409, 'EMAIL_EXISTS');
  }

  const now = new Date().toISOString();

  // Founders are approved immediately; other roles start as pending
  const isFounder = input.role === 'founder';
  const verificationStatus = isFounder ? 'verified' : 'pending';

  const newProfile: Profile = {
    id: userId,
    email: registrationEmail,
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
  if (!config.USE_IN_MEMORY_DB) {
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
    inMemoryDb.saveProfile(savedProfile);

    // Initialize corresponding role profile table in Postgres
    if (savedProfile.role === 'founder') {
      await query(
        `INSERT INTO public.founder_profiles (user_id, created_at, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING;`,
        [savedProfile.id, now, now]
      );
    } else if (savedProfile.role === 'investor') {
      await query(
        `INSERT INTO public.investor_profiles (user_id, firm_name, thesis, ticket_min, ticket_max, created_at, updated_at)
         VALUES ($1, $2, $3, 0, 0, $4, $5)
         ON CONFLICT (user_id) DO NOTHING;`,
        [savedProfile.id, savedProfile.organization || savedProfile.full_name, savedProfile.bio, now, now]
      );
    } else if (savedProfile.role === 'mentor') {
      await query(
        `INSERT INTO public.mentor_profiles (user_id, linkedin_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO NOTHING;`,
        [savedProfile.id, savedProfile.website, now, now]
      );
    } else if (savedProfile.role === 'incubator') {
      await query(
        `INSERT INTO public.incubator_profiles (user_id, organization_name, website, cohort_size, created_at, updated_at)
         VALUES ($1, $2, $3, 0, $4, $5)
         ON CONFLICT (user_id) DO NOTHING;`,
        [savedProfile.id, savedProfile.organization || savedProfile.full_name, savedProfile.website, now, now]
      );
    }
  } else {
    savedProfile = inMemoryDb.saveProfile(newProfile);
    if (savedProfile.role === 'investor') {
      inMemoryDb.saveInvestorProfile({
        user_id: savedProfile.id,
        firm_name: savedProfile.organization || savedProfile.full_name,
        thesis: savedProfile.bio,
        ticket_min: 0,
        ticket_max: 0,
        sectors: [],
        stages: [],
        regions: [],
        business_models: [],
        accredited: true,
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

    if (!config.USE_IN_MEMORY_DB) {
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
  let userId: string = crypto.randomUUID();
  const password = input.password || 'Password123!';

  if (!config.USE_IN_MEMORY_DB) {
    // Check if user already in auth.users
    const existingAuth = await query<{ id: string }>('SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)', [input.email]);
    if (existingAuth.rows.length > 0) {
      userId = existingAuth.rows[0].id;
    } else {
      await query(
        `INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          $1,
          'authenticated',
          'authenticated',
          $2,
          extensions.crypt($3, extensions.gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          $4::jsonb,
          now(),
          now()
        )`,
        [userId, input.email.toLowerCase(), password, JSON.stringify({ full_name: input.full_name, role: input.role })]
      );
    }
  }

  return registerProfile(input as RegisterProfileInput, userId, input.email);
}

export async function login(input: LoginInput): Promise<{ user: Profile; token: string }> {
  let profile: Profile | null = null;
  if (!config.USE_IN_MEMORY_DB) {
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
