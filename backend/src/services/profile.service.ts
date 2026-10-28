import { inMemoryDb, query } from '../db/index.js';
import type { Profile } from '../db/types.js';
import { AppError } from '../middleware/error.middleware.js';
import type { UpdateProfileInput } from '../schemas/auth.schema.js';
import { config } from '../config.js';

export async function getProfile(id: string): Promise<Profile> {
  let profile: Profile | null = null;

  if (!config.USE_IN_MEMORY_DB) {
    const res = await query<Profile>('SELECT * FROM public.profiles WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length > 0) profile = res.rows[0];
  } else {
    profile = inMemoryDb.getProfileById(id);
  }

  if (!profile) {
    throw new AppError('Profile not found', 404, 'NOT_FOUND');
  }

  return profile;
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<Profile> {
  const current = await getProfile(id);

  const updated: Profile = {
    ...current,
    full_name: input.full_name !== undefined ? input.full_name : current.full_name,
    is_student: input.is_student !== undefined ? input.is_student : current.is_student,
    organization: input.organization !== undefined ? input.organization : current.organization,
    avatar_url: input.avatar_url !== undefined ? input.avatar_url : current.avatar_url,
    bio: input.bio !== undefined ? input.bio : current.bio,
    location: input.location !== undefined ? input.location : current.location,
    website: input.website !== undefined ? input.website : current.website,
    updated_at: new Date().toISOString(),
  };

  if (!config.USE_IN_MEMORY_DB) {
    const updateSql = `
      UPDATE public.profiles SET
        full_name = $1,
        is_student = $2,
        organization = $3,
        avatar_url = $4,
        bio = $5,
        location = $6,
        website = $7,
        updated_at = $8
      WHERE id = $9
      RETURNING *;
    `;
    const res = await query<Profile>(updateSql, [
      updated.full_name,
      updated.is_student,
      updated.organization,
      updated.avatar_url,
      updated.bio,
      updated.location,
      updated.website,
      updated.updated_at,
      id,
    ]);
    return res.rows[0];
  }

  return inMemoryDb.saveProfile(updated);
}
