import type { Startup } from '../db/schema.types.js';

export const COMPLETENESS_FIELDS = [
  'name',
  'logo',
  'tagline',
  'sectors',
  'stage',
  'problem',
  'solution',
  'target_market',
  'business_model',
  'funding_ask',
  'location',
] as const;

export const TOTAL_COMPLETENESS_FIELDS = COMPLETENESS_FIELDS.length; // 11

/**
 * Computes profile completeness (0-100) based on 11 core startup fields:
 * name, logo, tagline, sectors, stage, problem, solution, target_market, business_model, funding_ask, location.
 */
export function computeProfileCompleteness(startup: Partial<Startup> | null | undefined): number {
  if (!startup) return 0;

  let filled = 0;

  // 1. name
  if (typeof startup.name === 'string' && startup.name.trim().length > 0) {
    filled++;
  }

  // 2. logo
  if (typeof startup.logo === 'string' && startup.logo.trim().length > 0) {
    filled++;
  }

  // 3. tagline
  if (typeof startup.tagline === 'string' && startup.tagline.trim().length > 0) {
    filled++;
  }

  // 4. sectors (array or sector string)
  const hasSectors =
    (Array.isArray(startup.sectors) && startup.sectors.some((s) => typeof s === 'string' && s.trim().length > 0)) ||
    (typeof startup.sector === 'string' && startup.sector.trim().length > 0);
  if (hasSectors) {
    filled++;
  }

  // 5. stage
  if (typeof startup.stage === 'string' && startup.stage.trim().length > 0) {
    filled++;
  }

  // 6. problem
  if (typeof startup.problem === 'string' && startup.problem.trim().length > 0) {
    filled++;
  }

  // 7. solution
  if (typeof startup.solution === 'string' && startup.solution.trim().length > 0) {
    filled++;
  }

  // 8. target_market
  if (typeof startup.target_market === 'string' && startup.target_market.trim().length > 0) {
    filled++;
  }

  // 9. business_model
  if (typeof startup.business_model === 'string' && startup.business_model.trim().length > 0) {
    filled++;
  }

  // 10. funding_ask (> 0)
  if (typeof startup.funding_ask === 'number' && !isNaN(startup.funding_ask) && startup.funding_ask > 0) {
    filled++;
  }

  // 11. location
  if (typeof startup.location === 'string' && startup.location.trim().length > 0) {
    filled++;
  }

  return Math.round((filled / TOTAL_COMPLETENESS_FIELDS) * 100);
}
