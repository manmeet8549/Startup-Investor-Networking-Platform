import { inMemoryDb, query } from '../db/index.js';
import { config } from '../config.js';
import {
  calculateMatchScore,
  MATCHING_DISCLAIMER,
  type StartupMatchingInput,
  type InvestorMatchingInput,
  type MatchResult,
} from '../matching/score.js';
import type { InvestorPreferencesInput } from '../schemas/matching.schema.js';
import { AppError } from '../middleware/error.middleware.js';
import { logger } from '../utils/logger.js';
import type { InvestorProfile, MatchScore, Startup } from '../db/schema.types.js';

export interface RankedInvestorMatch {
  investor: {
    id: string;
    full_name: string;
    organization: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    sectors: string[];
    stages: string[];
    ticket_min: number;
    ticket_max: number;
    regions: string[];
    business_models: string[];
    thesis: string | null;
    verification_status: string;
  };
  score: number;
  breakdown: MatchResult['breakdown'];
  reasons: string[];
  disclaimer: string;
}

export interface RankedStartupMatch {
  startup: {
    id: string;
    name: string;
    logo?: string | null;
    tagline: string;
    sectors: string[];
    stage: string;
    funding_ask: number;
    currency: string;
    location: string;
    visibility: string;
    business_model?: string | null;
    profile_completeness?: number;
  };
  score: number;
  breakdown: MatchResult['breakdown'];
  reasons: string[];
  disclaimer: string;
}

export class MatchingService {
  /**
   * Retrieves investor preferences.
   */
  async getInvestorPreferences(userId: string): Promise<InvestorProfile> {
    if (!config.USE_IN_MEMORY_DB) {
      const dbRes = await query<InvestorProfile>(
        `SELECT * FROM public.investor_profiles WHERE user_id = $1`,
        [userId]
      );
      if (dbRes.rows.length > 0) {
        return dbRes.rows[0];
      }
      const profRes = await query<{ full_name: string; organization: string | null; bio: string | null }>(
        `SELECT full_name, organization, bio FROM public.profiles WHERE id = $1`,
        [userId]
      );
      const prof = profRes.rows[0];
      const defaultFirmName = prof?.organization || prof?.full_name || 'Angel Investor';
      const defaultThesis = prof?.bio || 'Backing scalable tech startups across India.';
      const insertRes = await query<InvestorProfile>(
        `INSERT INTO public.investor_profiles (
          user_id, firm_name, sectors, stages, ticket_min, ticket_max, regions, business_models, thesis, accredited, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now()
        ) RETURNING *`,
        [
          userId,
          defaultFirmName,
          ['AgriTech', 'AI', 'Climate Tech'],
          ['mvp', 'early_traction'],
          1000000,
          5000000,
          ['Punjab', 'North India', 'Pan-India'],
          ['B2B', 'SaaS', 'Marketplace'],
          defaultThesis,
          true,
        ]
      );
      return insertRes.rows[0];
    }

    const ip = inMemoryDb.getInvestorProfile(userId);
    if (ip) {
      return ip;
    }

    const profile = inMemoryDb.getProfileById(userId);
    const defaultProfile: InvestorProfile = {
      user_id: userId,
      firm_name: profile?.organization || profile?.full_name || 'Angel Investor',
      sectors: ['AgriTech', 'AI', 'Climate Tech'],
      stages: ['mvp', 'early_traction'],
      ticket_min: 1000000,
      ticket_max: 5000000,
      regions: ['Punjab', 'North India', 'Pan-India'],
      business_models: ['B2B', 'SaaS', 'Marketplace'],
      thesis: profile?.bio || 'Backing scalable tech startups across India.',
      accredited: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return inMemoryDb.saveInvestorProfile(defaultProfile);
  }

  /**
   * Updates investor preferences and invalidates cached match_scores.
   */
  async updateInvestorPreferences(
    userId: string,
    data: InvestorPreferencesInput
  ): Promise<InvestorProfile> {
    if (data.ticket_max < data.ticket_min) {
      throw new AppError(
        'ticket_max must be greater than or equal to ticket_min',
        400,
        'VALIDATION_ERROR'
      );
    }

    const existing = await this.getInvestorPreferences(userId);
    const updated: InvestorProfile = {
      ...existing,
      sectors: data.sectors,
      stages: data.stages,
      ticket_min: data.ticket_min,
      ticket_max: data.ticket_max,
      regions: data.regions || [],
      business_models: data.business_models || [],
      thesis: data.thesis !== undefined ? data.thesis : existing.thesis,
      firm_name: data.firm_name !== undefined ? data.firm_name : existing.firm_name,
      updated_at: new Date().toISOString(),
    };

    if (!config.USE_IN_MEMORY_DB) {
      await query(
        `INSERT INTO public.investor_profiles (
          user_id, firm_name, sectors, stages, ticket_min, ticket_max, regions, business_models, thesis, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        ON CONFLICT (user_id) DO UPDATE SET
          firm_name = EXCLUDED.firm_name,
          sectors = EXCLUDED.sectors,
          stages = EXCLUDED.stages,
          ticket_min = EXCLUDED.ticket_min,
          ticket_max = EXCLUDED.ticket_max,
          regions = EXCLUDED.regions,
          business_models = EXCLUDED.business_models,
          thesis = EXCLUDED.thesis,
          updated_at = now()`,
        [
          userId,
          updated.firm_name,
          updated.sectors,
          updated.stages,
          updated.ticket_min,
          updated.ticket_max,
          updated.regions,
          updated.business_models,
          updated.thesis,
        ]
      );
      await query(`DELETE FROM public.match_scores WHERE investor_id = $1`, [userId]);
      return updated;
    }

    // Invalidate in-memory cache and save
    inMemoryDb.saveInvestorProfile(updated);
    inMemoryDb.invalidateMatchesForInvestor(userId);

    logger.info({ userId }, 'Investor preferences updated and match cache invalidated');
    return updated;
  }

  /**
   * Ranked investor matches for a startup (Founder flow)
   * GET /matches/investors?startup_id=
   */
  async matchInvestorsForStartup(
    startupId: string,
    callerUser?: any,
    page = 1,
    limit = 20
  ): Promise<{
    data: RankedInvestorMatch[];
    meta: { page: number; limit: number; total: number; total_pages: number };
    disclaimer: string;
  }> {
    let startup: Startup | null = null;
    if (!config.USE_IN_MEMORY_DB) {
      const sRes = await query<Startup>('SELECT * FROM public.startups WHERE id = $1', [startupId]);
      if (sRes.rows.length > 0) startup = sRes.rows[0];
    } else {
      startup = inMemoryDb.getStartupById(startupId);
    }
    if (!startup) {
      throw new AppError('Startup not found', 404, 'NOT_FOUND');
    }

    // Authorization check
    if (callerUser && callerUser.role === 'founder' && startup.founder_id !== callerUser.id) {
      throw new AppError('You do not own this startup', 403, 'FORBIDDEN');
    }

    // 1. Fetch only verified / approved active investors
    const verifiedInvestors = inMemoryDb.listVerifiedInvestors();

    const matches: RankedInvestorMatch[] = [];

    const startupInput: StartupMatchingInput = {
      id: startup.id,
      name: startup.name,
      sector: startup.sector,
      sectors: startup.sectors || [startup.sector],
      stage: startup.stage,
      funding_ask: startup.funding_ask,
      location: startup.location,
      business_model: startup.business_model,
    };

    for (const { profile, investorProfile } of verifiedInvestors) {
      // Check cache in matchScores
      let cachedScore = inMemoryDb.getCachedMatchScore(profile.id, startup.id);
      let matchResult: MatchResult;

      if (cachedScore && cachedScore.breakdown && cachedScore.reasons) {
        matchResult = {
          score: cachedScore.overall_score,
          breakdown: cachedScore.breakdown as any,
          reasons: cachedScore.reasons,
          disclaimer: MATCHING_DISCLAIMER,
        };
      } else {
        const investorInput: InvestorMatchingInput = {
          user_id: profile.id,
          sectors: investorProfile.sectors,
          stages: investorProfile.stages,
          ticket_min: investorProfile.ticket_min,
          ticket_max: investorProfile.ticket_max,
          regions: investorProfile.regions,
          business_models: investorProfile.business_models,
        };

        matchResult = calculateMatchScore(startupInput, investorInput);

        // Store into cache
        const scoreRecord: MatchScore = {
          id: `match-${profile.id}-${startup.id}`,
          investor_id: profile.id,
          startup_id: startup.id,
          overall_score: matchResult.score,
          sector_score: matchResult.breakdown.industry.score,
          stage_score: matchResult.breakdown.stage.score,
          funding_score: matchResult.breakdown.funding.score,
          location_score: matchResult.breakdown.location.score,
          model_score: matchResult.breakdown.business_model.score,
          reasons: matchResult.reasons,
          breakdown: matchResult.breakdown as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        inMemoryDb.saveMatchScore(scoreRecord);
      }

      matches.push({
        investor: {
          id: profile.id,
          full_name: profile.full_name,
          organization: profile.organization || investorProfile.firm_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          location: profile.location,
          sectors: investorProfile.sectors,
          stages: investorProfile.stages,
          ticket_min: investorProfile.ticket_min,
          ticket_max: investorProfile.ticket_max,
          regions: investorProfile.regions,
          business_models: investorProfile.business_models,
          thesis: investorProfile.thesis,
          verification_status: profile.verification_status,
        },
        score: matchResult.score,
        breakdown: matchResult.breakdown,
        reasons: matchResult.reasons,
        disclaimer: MATCHING_DISCLAIMER,
      });
    }

    // 2. Deterministic ordering: score DESC, tie-breaking by investor ID ASC
    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.investor.id.localeCompare(b.investor.id);
    });

    // 3. Pagination
    const total = matches.length;
    const total_pages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = matches.slice(offset, offset + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        total_pages,
      },
      disclaimer: MATCHING_DISCLAIMER,
    };
  }

  /**
   * Ranked startup matches for an investor (Investor flow)
   * GET /matches/startups
   */
  async matchStartupsForInvestor(
    investorUserId: string,
    callerUser?: any,
    page = 1,
    limit = 20
  ): Promise<{
    data: RankedStartupMatch[];
    meta: { page: number; limit: number; total: number; total_pages: number };
    disclaimer: string;
  }> {
    const investorProfile = await this.getInvestorPreferences(investorUserId);

    const investorInput: InvestorMatchingInput = {
      user_id: investorUserId,
      sectors: investorProfile.sectors,
      stages: investorProfile.stages,
      ticket_min: investorProfile.ticket_min,
      ticket_max: investorProfile.ticket_max,
      regions: investorProfile.regions,
      business_models: investorProfile.business_models,
    };

    // Only listed startups (public or access_controlled, not hidden, founder verified)
    let listedStartups: (Startup & { founder_verification_status?: string })[] = [];
    if (!config.USE_IN_MEMORY_DB) {
      const res = await query<Startup & { founder_verification_status: string }>(
        `SELECT s.*, p.verification_status as founder_verification_status
         FROM public.startups s
         JOIN public.profiles p ON s.founder_id = p.id
         WHERE s.is_hidden = false
           AND s.visibility != 'private'
           AND p.verification_status::text IN ('verified', 'approved')`
      );
      listedStartups = res.rows;
    } else {
      listedStartups = inMemoryDb.listStartups().filter((s) => {
        if (s.is_hidden || s.visibility === 'private') return false;
        const founder = inMemoryDb.getProfileById(s.founder_id);
        return (
          founder &&
          (founder.verification_status === 'verified' ||
            (founder.verification_status as string) === 'approved')
        );
      });
    }

    const matches: RankedStartupMatch[] = [];

    for (const startup of listedStartups) {
      let cachedScore = inMemoryDb.getCachedMatchScore(investorUserId, startup.id);
      let matchResult: MatchResult;

      if (cachedScore && cachedScore.breakdown && cachedScore.reasons) {
        matchResult = {
          score: cachedScore.overall_score,
          breakdown: cachedScore.breakdown as any,
          reasons: cachedScore.reasons,
          disclaimer: MATCHING_DISCLAIMER,
        };
      } else {
        const startupInput: StartupMatchingInput = {
          id: startup.id,
          name: startup.name,
          sector: startup.sector,
          sectors: startup.sectors || [startup.sector],
          stage: startup.stage,
          funding_ask: startup.funding_ask,
          location: startup.location,
          business_model: startup.business_model,
        };

        matchResult = calculateMatchScore(startupInput, investorInput);

        const scoreRecord: MatchScore = {
          id: `match-${investorUserId}-${startup.id}`,
          investor_id: investorUserId,
          startup_id: startup.id,
          overall_score: matchResult.score,
          sector_score: matchResult.breakdown.industry.score,
          stage_score: matchResult.breakdown.stage.score,
          funding_score: matchResult.breakdown.funding.score,
          location_score: matchResult.breakdown.location.score,
          model_score: matchResult.breakdown.business_model.score,
          reasons: matchResult.reasons,
          breakdown: matchResult.breakdown as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        inMemoryDb.saveMatchScore(scoreRecord);
      }

      matches.push({
        startup: {
          id: startup.id,
          name: startup.name,
          logo: startup.logo,
          tagline: startup.tagline,
          sectors: startup.sectors || [startup.sector],
          stage: startup.stage,
          funding_ask: startup.funding_ask,
          currency: startup.currency,
          location: startup.location,
          visibility: startup.visibility,
          business_model: startup.business_model,
          profile_completeness: startup.profile_completeness,
        },
        score: matchResult.score,
        breakdown: matchResult.breakdown,
        reasons: matchResult.reasons,
        disclaimer: MATCHING_DISCLAIMER,
      });
    }

    // Deterministic ordering: score DESC, tie-breaking by startup ID ASC
    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.startup.id.localeCompare(b.startup.id);
    });

    const total = matches.length;
    const total_pages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = matches.slice(offset, offset + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        total_pages,
      },
      disclaimer: MATCHING_DISCLAIMER,
    };
  }
}

export const matchingService = new MatchingService();
