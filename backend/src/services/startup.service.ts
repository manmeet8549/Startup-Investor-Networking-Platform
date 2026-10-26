import crypto from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import type { Startup, StartupTeamMember } from '../db/schema.types.js';
import { AppError } from '../middleware/error.middleware.js';
import { computeProfileCompleteness } from './completeness.service.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { Profile } from '../db/types.js';
import type {
  CreateStartupInput,
  UpdateStartupInput,
  TeamMemberInput,
  UpdateTeamMemberInput,
  StartupFilterQuery,
} from '../schemas/startup.schema.js';

export interface StartupDiscoveryItem extends Startup {
  has_access?: boolean;
  access_status?: 'none' | 'pending' | 'approved' | 'rejected';
}

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
): Promise<StartupDiscoveryItem> {
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

  // 1. Access check for private startups
  if (startup.visibility === 'private') {
    if (!user || (user.id !== startup.founder_id && user.role !== 'admin')) {
      throw new AppError('Access forbidden: this startup profile is private', 403, 'FORBIDDEN');
    }
  }

  startup.profile_completeness = computeProfileCompleteness(startup);

  // 2. Sensitive fields handling based on caller access
  let hasAccess = false;
  let accessStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none';

  if (startup.visibility === 'public') {
    hasAccess = true;
    accessStatus = 'approved';
  } else if (user) {
    if (user.role === 'admin' || user.id === startup.founder_id) {
      hasAccess = true;
      accessStatus = 'approved';
    } else {
      // Check document access requests for this user and startup
      if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
        const reqRes = await query<{ status: string }>(
          `SELECT status FROM public.document_access_requests
           WHERE requester_id = $1 AND startup_id = $2
           ORDER BY CASE WHEN status = 'approved' THEN 1 WHEN status = 'pending' THEN 2 ELSE 3 END
           LIMIT 1`,
          [user.id, startup.id]
        );
        if (reqRes.rows.length > 0) {
          accessStatus = reqRes.rows[0].status as any;
          hasAccess = accessStatus === 'approved';
        }
      } else {
        accessStatus = inMemoryDb.getStartupAccessStatus(user.id, startup.id);
        hasAccess = accessStatus === 'approved';
      }
    }
  }

  if (!hasAccess) {
    // Redact sensitive fields for callers who do not have approved access
    const { problem, solution, target_market, business_model, ...rest } = startup;
    return {
      ...rest,
      problem: null,
      solution: null,
      target_market: null,
      business_model: null,
      has_access: false,
      access_status: accessStatus,
      profile_completeness: startup.profile_completeness,
    };
  }

  return {
    ...startup,
    has_access: true,
    access_status: 'approved',
    profile_completeness: startup.profile_completeness,
  };
}

export async function listStartups(
  filter: StartupFilterQuery,
  user?: Profile
): Promise<{
  data: StartupDiscoveryItem[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}> {
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    try {
      const isVerified =
        user &&
        (user.role === 'admin' ||
          user.verification_status === 'verified' ||
          (user.verification_status as string) === 'approved');

      const conditions: string[] = [
        's.is_hidden = false',
        "p.status != 'suspended'",
        "p.verification_status IN ('approved', 'verified')",
        "s.visibility != 'private'",
      ];
      const params: any[] = [];
      let pIdx = 1;

      if (!isVerified) {
        conditions.push("s.visibility = 'public'");
      }

      if (filter.sector && filter.sector.length > 0) {
        conditions.push(`(s.sector = ANY($${pIdx}) OR s.sectors && $${pIdx})`);
        params.push(filter.sector);
        pIdx++;
      }

      if (filter.stage) {
        conditions.push(`s.stage = $${pIdx}`);
        params.push(filter.stage);
        pIdx++;
      }

      if (filter.location) {
        conditions.push(`s.location ILIKE $${pIdx}`);
        params.push(`%${filter.location}%`);
        pIdx++;
      }

      if (filter.funding_min !== undefined) {
        conditions.push(`s.funding_ask >= $${pIdx}`);
        params.push(filter.funding_min);
        pIdx++;
      }

      if (filter.funding_max !== undefined) {
        conditions.push(`s.funding_ask <= $${pIdx}`);
        params.push(filter.funding_max);
        pIdx++;
      }

      if (filter.business_model) {
        conditions.push(`s.business_model ILIKE $${pIdx}`);
        params.push(`%${filter.business_model}%`);
        pIdx++;
      }

      if (filter.q && filter.q.trim()) {
        conditions.push(
          `(s.name ILIKE $${pIdx} OR s.tagline ILIKE $${pIdx} OR s.description ILIKE $${pIdx} OR s.location ILIKE $${pIdx} OR s.problem ILIKE $${pIdx} OR s.solution ILIKE $${pIdx} OR s.business_model ILIKE $${pIdx})`
        );
        params.push(`%${filter.q.trim()}%`);
        pIdx++;
      }

      let orderBy = 's.created_at DESC';
      if (filter.sort === 'funding') {
        orderBy = 's.funding_ask DESC';
      }

      const whereClause = conditions.join(' AND ');
      const countRes = await query<{ count: string }>(
        `SELECT COUNT(*) FROM public.startups s
         JOIN public.profiles p ON s.founder_id = p.id
         WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const limit = Math.max(1, Math.min(100, filter.limit || 20));
      const page = Math.max(1, filter.page || 1);
      const offset = (page - 1) * limit;

      params.push(limit);
      const limitParam = `$${pIdx++}`;
      params.push(offset);
      const offsetParam = `$${pIdx++}`;

      const res = await query<Startup>(
        `SELECT s.* FROM public.startups s
         JOIN public.profiles p ON s.founder_id = p.id
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params
      );

      const items: StartupDiscoveryItem[] = res.rows.map((s) => {
        const completeness = computeProfileCompleteness(s);
        const hasAccess =
          s.visibility === 'public' ||
          (user && (user.role === 'admin' || user.id === s.founder_id));

        if (!hasAccess) {
          const { problem, solution, target_market, business_model, ...rest } = s;
          return {
            ...rest,
            problem: null,
            solution: null,
            target_market: null,
            business_model: null,
            has_access: false,
            access_status: 'none' as const,
            profile_completeness: completeness,
          };
        }

        return {
          ...s,
          has_access: true,
          access_status: 'approved' as const,
          profile_completeness: completeness,
        };
      });

      return {
        data: items,
        meta: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err) {
      logger.error({ err }, 'Failed PostgreSQL listStartups query, falling back to inMemoryDb');
    }
  }

  // Fallback to in-memory store
  const res = inMemoryDb.listStartupsWithFilters({
    q: filter.q,
    sectors: filter.sector,
    stage: filter.stage,
    location: filter.location,
    funding_min: filter.funding_min,
    funding_max: filter.funding_max,
    business_model: filter.business_model,
    sort: filter.sort,
    page: filter.page,
    limit: filter.limit,
    user,
  });

  return {
    data: res.items.map((s) => ({
      ...s,
      profile_completeness: s.profile_completeness ?? computeProfileCompleteness(s),
    })),
    meta: {
      total: res.total,
      page: res.page,
      limit: res.limit,
      total_pages: res.total_pages,
    },
  };
}

export async function getFilterMetadata() {
  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    try {
      const sectorsRes = await query<{ sector: string; count: string }>(
        `SELECT unnest(sectors) as sector, count(*)::text as count
         FROM public.startups
         WHERE is_hidden = false AND visibility != 'private'
         GROUP BY sector
         ORDER BY count(*) DESC`
      );
      const stagesRes = await query<{ stage: string; count: string }>(
        `SELECT stage, count(*)::text as count
         FROM public.startups
         WHERE is_hidden = false AND visibility != 'private'
         GROUP BY stage`
      );
      const locationsRes = await query<{ location: string; count: string }>(
        `SELECT location, count(*)::text as count
         FROM public.startups
         WHERE is_hidden = false AND visibility != 'private' AND location IS NOT NULL AND location != ''
         GROUP BY location
         ORDER BY count(*) DESC`
      );

      const standardStages = ['idea', 'validation', 'mvp', 'early_traction', 'growth'];
      const stagesMap = new Map(stagesRes.rows.map((r) => [r.stage, parseInt(r.count, 10)]));
      const stages = standardStages.map((st) => ({
        stage: st,
        label: st.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count: stagesMap.get(st) || 0,
      }));

      return {
        sectors: sectorsRes.rows.map((r) => ({ sector: r.sector, count: parseInt(r.count, 10) })),
        stages,
        locations: locationsRes.rows.map((r) => ({ location: r.location, count: parseInt(r.count, 10) })),
      };
    } catch (err) {
      logger.error({ err }, 'Failed to fetch metadata from PostgreSQL, falling back to inMemoryDb');
    }
  }

  return {
    sectors: inMemoryDb.getDistinctSectors(),
    stages: inMemoryDb.getDistinctStages(),
    locations: inMemoryDb.getDistinctLocations(),
  };
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

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<StartupTeamMember>(
      `UPDATE public.startup_team_members
       SET name = COALESCE($1, name),
           role_title = COALESCE($2, role_title),
           email = COALESCE($3, email),
           is_primary = COALESCE($4, is_primary),
           updated_at = NOW()
       WHERE id = $5 AND startup_id = $6
       RETURNING *`,
      [input.name || null, input.role_title || null, input.email || null, input.is_primary ?? null, memberId, startupId]
    );
    if (res.rows.length === 0) {
      throw new AppError('Team member not found', 404, 'NOT_FOUND');
    }
    return res.rows[0];
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

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query(
      'DELETE FROM public.startup_team_members WHERE id = $1 AND startup_id = $2',
      [memberId, startupId]
    );
    if (res.rowCount === 0) {
      throw new AppError('Team member not found', 404, 'NOT_FOUND');
    }
    return;
  }

  const existingMember = inMemoryDb.getTeamMemberById(memberId);
  if (!existingMember || existingMember.startup_id !== startupId) {
    throw new AppError('Team member not found', 404, 'NOT_FOUND');
  }

  inMemoryDb.deleteTeamMember(memberId);
}
