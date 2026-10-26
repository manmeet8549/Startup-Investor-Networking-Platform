import crypto from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import type { Startup, StartupTeamMember } from '../db/schema.types.js';
import { AppError } from '../middleware/error.middleware.js';
import { computeProfileCompleteness } from './completeness.service.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type {
  CreateStartupInput,
  UpdateStartupInput,
  TeamMemberInput,
  UpdateTeamMemberInput,
} from '../schemas/startup.schema.js';

export async function createStartup(
  founderId: string,
  input: CreateStartupInput
): Promise<Startup> {
  const startupId = crypto.randomUUID();
  const now = new Date().toISOString();

  const sectors = input.sectors && input.sectors.length > 0 ? input.sectors : ['Technology'];
  const primarySector = sectors[0] || 'Technology';

  const newStartup: Startup = {
    id: startupId,
    founder_id: founderId,
    name: input.name,
    tagline: input.tagline,
    description: input.description || input.tagline,
    sector: primarySector,
    sectors,
    stage: input.stage,
    location: input.location,
    funding_ask: input.funding_ask ?? 0,
    currency: input.currency || 'INR',
    visibility: input.visibility || 'access_controlled',
    logo: input.logo || null,
    problem: input.problem || null,
    solution: input.solution || null,
    target_market: input.target_market || null,
    business_model: input.business_model || null,
    pitch_deck_url: input.pitch_deck_url || null,
    website: input.website || null,
    created_at: now,
    updated_at: now,
  };

  const completeness = computeProfileCompleteness(newStartup);
  newStartup.profile_completeness = completeness;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    try {
      const res = await query<Startup>(
        `INSERT INTO public.startups
          (id, founder_id, name, tagline, description, sector, sectors, stage, location,
           funding_ask, currency, visibility, logo, problem, solution, target_market,
           business_model, pitch_deck_url, website, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         RETURNING *`,
        [
          newStartup.id,
          newStartup.founder_id,
          newStartup.name,
          newStartup.tagline,
          newStartup.description,
          newStartup.sector,
          newStartup.sectors,
          newStartup.stage,
          newStartup.location,
          newStartup.funding_ask,
          newStartup.currency,
          newStartup.visibility,
          newStartup.logo,
          newStartup.problem,
          newStartup.solution,
          newStartup.target_market,
          newStartup.business_model,
          newStartup.pitch_deck_url,
          newStartup.website,
          newStartup.created_at,
          newStartup.updated_at,
        ]
      );
      if (res.rows.length > 0) {
        const saved = res.rows[0];
        saved.profile_completeness = computeProfileCompleteness(saved);
        return saved;
      }
    } catch (err) {
      logger.error({ err }, 'Failed to insert startup into PostgreSQL, falling back to inMemoryDb');
    }
  }

  inMemoryDb.createStartup(newStartup);
  return newStartup;
}

export async function getStartupById(
  id: string,
  user?: { id: string; role: string; verification_status?: string }
): Promise<Startup> {
  let startup: Startup | null = null;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Startup>('SELECT * FROM public.startups WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length > 0) {
      startup = res.rows[0];
    }
  } else {
    startup = inMemoryDb.getStartupById(id);
  }

  if (!startup) {
    throw new AppError('Startup not found', 404, 'NOT_FOUND');
  }

  // Access check for private startups
  if (startup.visibility === 'private') {
    if (!user || (user.id !== startup.founder_id && user.role !== 'admin')) {
      throw new AppError('Access forbidden: this startup profile is private', 403, 'FORBIDDEN');
    }
  }

  startup.profile_completeness = computeProfileCompleteness(startup);
  return startup;
}

export async function listMyStartups(founderId: string): Promise<Startup[]> {
  let list: Startup[] = [];

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Startup>(
      'SELECT * FROM public.startups WHERE founder_id = $1 ORDER BY created_at DESC',
      [founderId]
    );
    list = res.rows;
  } else {
    list = inMemoryDb.listStartupsByFounder(founderId);
  }

  return list.map((s) => ({
    ...s,
    profile_completeness: computeProfileCompleteness(s),
  }));
}

export async function updateStartup(
  id: string,
  userId: string,
  userRole: string,
  updates: UpdateStartupInput
): Promise<Startup> {
  const startup = await getStartupById(id, { id: userId, role: userRole });

  if (startup.founder_id !== userId && userRole !== 'admin') {
    throw new AppError('Only the startup owner or admin can update this startup', 403, 'FORBIDDEN');
  }

  const updatedData: Partial<Startup> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.sectors && updates.sectors.length > 0) {
    updatedData.sectors = updates.sectors;
    updatedData.sector = updates.sectors[0];
  }

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    try {
      const keys = Object.keys(updatedData);
      const values = Object.values(updatedData);
      const setClause = keys.map((k, idx) => `${k} = $${idx + 1}`).join(', ');
      const res = await query<Startup>(
        `UPDATE public.startups SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );
      if (res.rows.length > 0) {
        const saved = res.rows[0];
        saved.profile_completeness = computeProfileCompleteness(saved);
        return saved;
      }
    } catch (err) {
      logger.error({ err }, 'Failed to update startup in PostgreSQL, updating inMemoryDb');
    }
  }

  const result = inMemoryDb.updateStartup(id, updatedData);
  if (!result) {
    throw new AppError('Startup not found', 404, 'NOT_FOUND');
  }
  result.profile_completeness = computeProfileCompleteness(result);
  return result;
}

export async function deleteStartup(
  id: string,
  userId: string,
  userRole: string
): Promise<void> {
  const startup = await getStartupById(id, { id: userId, role: userRole });

  if (startup.founder_id !== userId && userRole !== 'admin') {
    throw new AppError('Only the startup owner or admin can delete this startup', 403, 'FORBIDDEN');
  }

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    await query('DELETE FROM public.startups WHERE id = $1', [id]);
  }
  inMemoryDb.deleteStartup(id);
}

// --- Team Members ---

export async function addTeamMember(
  startupId: string,
  userId: string,
  userRole: string,
  input: TeamMemberInput
): Promise<StartupTeamMember> {
  const startup = await getStartupById(startupId, { id: userId, role: userRole });

  if (startup.founder_id !== userId && userRole !== 'admin') {
    throw new AppError('Only the startup owner or admin can manage team members', 403, 'FORBIDDEN');
  }

  const memberId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newMember: StartupTeamMember = {
    id: memberId,
    startup_id: startupId,
    user_id: input.user_id || null,
    name: input.name,
    role_title: input.role_title,
    email: input.email || null,
    is_primary: input.is_primary ?? false,
    created_at: now,
    updated_at: now,
  };

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    try {
      const res = await query<StartupTeamMember>(
        `INSERT INTO public.startup_team_members
          (id, startup_id, user_id, name, role_title, email, is_primary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          newMember.id,
          newMember.startup_id,
          newMember.user_id,
          newMember.name,
          newMember.role_title,
          newMember.email,
          newMember.is_primary,
          newMember.created_at,
          newMember.updated_at,
        ]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      logger.error({ err }, 'Failed to insert team member to PostgreSQL, saving to inMemoryDb');
    }
  }

  return inMemoryDb.createTeamMember(newMember);
}

export async function listTeamMembers(
  startupId: string,
  user?: { id: string; role: string }
): Promise<StartupTeamMember[]> {
  // Ensure startup exists and user has view access
  await getStartupById(startupId, user);

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<StartupTeamMember>(
      'SELECT * FROM public.startup_team_members WHERE startup_id = $1 ORDER BY created_at ASC',
      [startupId]
    );
    return res.rows;
  }

  return inMemoryDb.listTeamMembers(startupId);
}

export async function updateTeamMember(
  startupId: string,
  memberId: string,
  userId: string,
  userRole: string,
  input: UpdateTeamMemberInput
): Promise<StartupTeamMember> {
  const startup = await getStartupById(startupId, { id: userId, role: userRole });

  if (startup.founder_id !== userId && userRole !== 'admin') {
    throw new AppError('Only the startup owner or admin can manage team members', 403, 'FORBIDDEN');
  }

  const existingMember = inMemoryDb.getTeamMemberById(memberId);
  if (!existingMember || existingMember.startup_id !== startupId) {
    throw new AppError('Team member not found', 404, 'NOT_FOUND');
  }

  const updated = inMemoryDb.updateTeamMember(memberId, input);
  if (!updated) {
    throw new AppError('Team member not found', 404, 'NOT_FOUND');
  }
  return updated;
}

export async function deleteTeamMember(
  startupId: string,
  memberId: string,
  userId: string,
  userRole: string
): Promise<void> {
  const startup = await getStartupById(startupId, { id: userId, role: userRole });

  if (startup.founder_id !== userId && userRole !== 'admin') {
    throw new AppError('Only the startup owner or admin can manage team members', 403, 'FORBIDDEN');
  }

  const existingMember = inMemoryDb.getTeamMemberById(memberId);
  if (!existingMember || existingMember.startup_id !== startupId) {
    throw new AppError('Team member not found', 404, 'NOT_FOUND');
  }

  inMemoryDb.deleteTeamMember(memberId);
}
