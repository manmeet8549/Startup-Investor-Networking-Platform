// Pure matching scoring engine - no database dependencies

export interface MatchingWeights {
  industry: number;
  stage: number;
  funding: number;
  location: number;
  business_model: number;
}

export const DEFAULT_WEIGHTS: MatchingWeights = {
  industry: 30,
  stage: 25,
  funding: 20,
  location: 15,
  business_model: 10,
};

export const MATCHING_DISCLAIMER =
  'The score measures profile compatibility, not the probability of funding.';

export interface StartupMatchingInput {
  id?: string;
  name?: string;
  sector?: string;
  sectors?: string[];
  stage?: string;
  funding_ask: number;
  location?: string;
  business_model?: string | null;
}

export interface InvestorMatchingInput {
  user_id?: string;
  sectors?: string[];
  stages?: string[];
  ticket_min: number;
  ticket_max: number;
  regions?: string[];
  business_models?: string[];
}

export interface CriterionResult {
  score: number;
  weight: number;
  weighted: number;
}

export interface ScoreBreakdown {
  industry: CriterionResult;
  stage: CriterionResult;
  funding: CriterionResult;
  location: CriterionResult;
  business_model: CriterionResult;
}

export interface MatchResult {
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  disclaimer: string;
}

// Canonical stages in pipeline progression order
export const CANONICAL_STAGES = [
  'idea',
  'validation',
  'mvp',
  'early_traction',
  'growth',
];

export function normalizeStage(rawStage?: string): string {
  if (!rawStage) return 'mvp';
  const s = rawStage.toLowerCase().trim().replace(/[-\s]+/g, '_');
  if (s === 'pre_seed' || s === 'preseed') return 'idea';
  if (s === 'seed') return 'mvp';
  if (s === 'series_a' || s === 'seriesa' || s === 'growth_stage') return 'growth';
  return s;
}

export function stageToIndex(stageStr?: string): number {
  const normalized = normalizeStage(stageStr);
  const idx = CANONICAL_STAGES.indexOf(normalized);
  return idx !== -1 ? idx : 2; // default to mvp (2)
}

/**
 * 1. Industry (weight 30):
 * Share of the startup's sectors the investor covers (0 - 100).
 */
export function scoreIndustry(
  startupSectors: string[],
  investorSectors: string[]
): { score: number; reason?: string } {
  const normStartup = (startupSectors || [])
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);

  if (normStartup.length === 0) {
    return { score: 0 };
  }

  const normInvestor = new Set(
    (investorSectors || []).map((s) => s.toLowerCase().trim()).filter(Boolean)
  );

  const matchedSectors: string[] = [];
  for (const s of startupSectors) {
    if (normInvestor.has(s.toLowerCase().trim())) {
      matchedSectors.push(s);
    }
  }

  const ratio = matchedSectors.length / normStartup.length;
  const score = Math.round(Math.min(100, Math.max(0, ratio * 100)));

  let reason: string | undefined;
  if (score === 100) {
    reason = `Matches sector${matchedSectors.length > 1 ? 's' : ''} ${matchedSectors.join(', ')}`;
  } else if (score > 0) {
    reason = `Covers ${score}% of startup sectors (${matchedSectors.join(', ')})`;
  }

  return { score, reason };
}

/**
 * 2. Stage (weight 25):
 * Exact stage = 100, adjacent stage = 50, otherwise 0.
 */
export function scoreStage(
  startupStage: string,
  investorStages: string[]
): { score: number; reason?: string } {
  const sIdx = stageToIndex(startupStage);
  const normInvestorStages = (investorStages || []).map((st) => normalizeStage(st));

  if (normInvestorStages.length === 0) {
    return { score: 0 };
  }

  const iIndices = normInvestorStages.map((st) => stageToIndex(st));
  let minDiff = 999;
  let bestStageMatch = '';

  for (let i = 0; i < normInvestorStages.length; i++) {
    const diff = Math.abs(iIndices[i] - sIdx);
    if (diff < minDiff) {
      minDiff = diff;
      bestStageMatch = investorStages[i];
    }
  }

  let score = 0;
  let reason: string | undefined;

  if (minDiff === 0) {
    score = 100;
    reason = `Exact stage alignment for ${startupStage.toUpperCase()}`;
  } else if (minDiff === 1) {
    score = 50;
    reason = `Adjacent stage fit (${startupStage} close to investor's ${bestStageMatch})`;
  }

  return { score, reason };
}

/**
 * 3. Funding (weight 20):
 * 100 if the ask is inside ticket range;
 * below min = 100 * ask / min;
 * above max = 100 * max / ask.
 */
export function scoreFunding(
  fundingAsk: number,
  ticketMin: number,
  ticketMax: number
): { score: number; reason?: string } {
  const ask = Number(fundingAsk) || 0;
  const min = Number(ticketMin) || 0;
  const max = Number(ticketMax) || 0;

  if (ask <= 0 || (min <= 0 && max <= 0)) {
    return { score: 0 };
  }

  let score = 0;
  let reason: string | undefined;

  if (min > 0 && max > 0 && ask >= min && ask <= max) {
    score = 100;
    reason = `Funding ask of ₹${formatCurrency(ask)} is within ticket range (₹${formatCurrency(min)}–₹${formatCurrency(max)})`;
  } else if (min > 0 && ask < min) {
    score = Math.round(Math.min(100, Math.max(0, (100 * ask) / min)));
    reason = `Funding ask of ₹${formatCurrency(ask)} is below min ticket of ₹${formatCurrency(min)}`;
  } else if (max > 0 && ask > max) {
    score = Math.round(Math.min(100, Math.max(0, (100 * max) / ask)));
    reason = `Funding ask of ₹${formatCurrency(ask)} exceeds max ticket of ₹${formatCurrency(max)}`;
  } else if (min > 0 && ask >= min) {
    score = 100;
    reason = `Funding ask of ₹${formatCurrency(ask)} meets minimum check size of ₹${formatCurrency(min)}`;
  }

  return { score, reason };
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)} Cr`;
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(0)} Lakh`;
  }
  return `${amount.toLocaleString()}`;
}

/**
 * 4. Location (weight 15):
 * same city 100, same state 80, same country 60, investor open to any region 60, otherwise 0.
 */
export function scoreLocation(
  startupLocation?: string,
  investorRegions?: string[]
): { score: number; reason?: string } {
  const regions = (investorRegions || []).map((r) => r.toLowerCase().trim()).filter(Boolean);

  if (regions.length === 0) {
    return { score: 60, reason: 'Investor is open to startups in any region' };
  }

  // Check for open/global/pan-india preferences
  const openToAll = regions.some((r) =>
    ['any', 'all', 'global', 'worldwide', 'pan-india', 'pan india', 'india'].includes(r)
  );

  if (!startupLocation || !startupLocation.trim()) {
    return openToAll
      ? { score: 60, reason: 'Investor is open to all geographic regions' }
      : { score: 0 };
  }

  const parts = startupLocation
    .split(',')
    .map((p) => p.toLowerCase().trim())
    .filter(Boolean);

  const city = parts[0] || '';
  const state = parts.length > 2 ? parts[1] : parts.length === 2 ? parts[0] : '';
  const country = parts.length > 1 ? parts[parts.length - 1] : '';

  // 1. Same city -> 100
  for (const r of regions) {
    if (city && (r === city || r.includes(city) || city.includes(r))) {
      return { score: 100, reason: `Local city match in ${capitalize(city)}` };
    }
  }

  // 2. Same state -> 80
  for (const r of regions) {
    if (
      (state && (r === state || r.includes(state) || state.includes(r))) ||
      (state.includes('punjab') && (r.includes('punjab') || r.includes('north india')))
    ) {
      return { score: 80, reason: `State/regional match in ${capitalize(state || 'Punjab')}` };
    }
  }

  // 3. Same country or open to any region -> 60
  for (const r of regions) {
    if (
      country &&
      (r === country ||
        (country.includes('india') && ['india', 'pan-india', 'pan india'].includes(r)))
    ) {
      return { score: 60, reason: 'National geographic match (Pan-India)' };
    }
  }

  if (openToAll) {
    return { score: 60, reason: 'Investor is open to any regional location' };
  }

  return { score: 0 };
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * 5. Business Model (weight 10):
 * Share of overlap, neutral 50 if the investor has no preference.
 */
export function scoreBusinessModel(
  startupModel?: string | null,
  investorModels?: string[]
): { score: number; reason?: string } {
  const normInvestor = (investorModels || [])
    .map((m) => m.toLowerCase().trim())
    .filter(Boolean);

  if (normInvestor.length === 0) {
    return { score: 50, reason: 'Investor has flexible business model preferences' };
  }

  if (!startupModel || !startupModel.trim()) {
    return { score: 50, reason: 'Startup business model flexible' };
  }

  // Extract tokens from startup model (e.g. "B2B SaaS" -> ["b2b", "saas"])
  const cleanStartup = startupModel.toLowerCase().trim();
  const startupTokens = cleanStartup
    .split(/[/,+\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const matchedModels: string[] = [];
  for (const invModel of normInvestor) {
    if (cleanStartup.includes(invModel) || startupTokens.includes(invModel)) {
      matchedModels.push(invModel.toUpperCase());
    }
  }

  if (matchedModels.length > 0) {
    return {
      score: 100,
      reason: `Compatible business model (${matchedModels.join(', ')})`,
    };
  }

  return { score: 0 };
}

/**
 * Main Pure Matching Calculation Function
 */
export function calculateMatchScore(
  startup: StartupMatchingInput,
  investor: InvestorMatchingInput,
  weights: MatchingWeights = DEFAULT_WEIGHTS
): MatchResult {
  // Normalize sectors
  const sSectors =
    startup.sectors && startup.sectors.length > 0
      ? startup.sectors
      : startup.sector
        ? [startup.sector]
        : [];

  const iSectors = investor.sectors || [];

  // 1. Industry
  const indResult = scoreIndustry(sSectors, iSectors);

  // 2. Stage
  const stgResult = scoreStage(startup.stage || 'mvp', investor.stages || []);

  // 3. Funding
  const fndResult = scoreFunding(
    startup.funding_ask,
    investor.ticket_min,
    investor.ticket_max
  );

  // 4. Location
  const locResult = scoreLocation(startup.location, investor.regions);

  // 5. Business Model
  const bmodResult = scoreBusinessModel(startup.business_model, investor.business_models);

  // Weighted score calculation
  const weightedIndustry = (indResult.score * weights.industry) / 100;
  const weightedStage = (stgResult.score * weights.stage) / 100;
  const weightedFunding = (fndResult.score * weights.funding) / 100;
  const weightedLocation = (locResult.score * weights.location) / 100;
  const weightedBusinessModel = (bmodResult.score * weights.business_model) / 100;

  const totalScore = Math.round(
    weightedIndustry +
      weightedStage +
      weightedFunding +
      weightedLocation +
      weightedBusinessModel
  );

  // Bounded between 0 and 100
  const finalScore = Math.max(0, Math.min(100, totalScore));

  const breakdown: ScoreBreakdown = {
    industry: {
      score: indResult.score,
      weight: weights.industry,
      weighted: Number(weightedIndustry.toFixed(1)),
    },
    stage: {
      score: stgResult.score,
      weight: weights.stage,
      weighted: Number(weightedStage.toFixed(1)),
    },
    funding: {
      score: fndResult.score,
      weight: weights.funding,
      weighted: Number(weightedFunding.toFixed(1)),
    },
    location: {
      score: locResult.score,
      weight: weights.location,
      weighted: Number(weightedLocation.toFixed(1)),
    },
    business_model: {
      score: bmodResult.score,
      weight: weights.business_model,
      weighted: Number(weightedBusinessModel.toFixed(1)),
    },
  };

  const reasons = [
    indResult.reason,
    stgResult.reason,
    fndResult.reason,
    locResult.reason,
    bmodResult.reason,
  ].filter(Boolean) as string[];

  return {
    score: finalScore,
    breakdown,
    reasons,
    disclaimer: MATCHING_DISCLAIMER,
  };
}
