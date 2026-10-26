import type { Startup as DbStartup, IncubatorProgram as DbProgram } from '../types/database';

export interface UiStartup {
  id: number;
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  location: string;
  ask: string;
  match: number;
  initials: string;
  color: string;
  description: string;
  visibility: string;
  founder: string;
  db_id?: string;
}

export interface UiInvestor {
  name: string;
  sector: string;
  stage: string;
  ticket: string;
  location: string;
  match: number;
  initials: string;
  color: string;
}

export interface UiProgram {
  name: string;
  org: string;
  sectors: string;
  deadline: string;
  benefit: string;
  status: string;
}

export function createMockStartup(overrides: Partial<UiStartup> = {}): UiStartup {
  return {
    id: Date.now(),
    name: 'New Startup',
    tagline: 'An ambitious startup building what is next.',
    sector: 'AgriTech',
    stage: 'MVP',
    location: 'Ludhiana, India',
    ask: '₹15L',
    match: 85,
    initials: 'NS',
    color: 'bg-emerald-100 text-emerald-800',
    description: 'Transforming traditional practices with digital workflows.',
    visibility: 'Access-controlled',
    founder: 'Founder',
    ...overrides,
  };
}

export function createMockInvestor(overrides: Partial<UiInvestor> = {}): UiInvestor {
  return {
    name: 'Venture Capital Partner',
    sector: 'AgriTech · Climate Tech',
    stage: 'Seed · Early traction',
    ticket: '₹25L–₹1Cr',
    location: 'India',
    match: 90,
    initials: 'VC',
    color: 'bg-emerald-100 text-emerald-800',
    ...overrides,
  };
}

export function createMockProgram(overrides: Partial<UiProgram> = {}): UiProgram {
  return {
    name: 'Innovation Cohort',
    org: 'Incubator Network',
    sectors: 'AgriTech, AI, Climate Tech',
    deadline: '30 Nov 2026',
    benefit: 'Mentorship · Grant funding · Demo day',
    status: 'Applications open',
    ...overrides,
  };
}

export const initialStartups: UiStartup[] = [
  createMockStartup({
    id: 1,
    name: 'TerraLoop',
    tagline: 'Turning agricultural waste into valuable materials.',
    sector: 'Climate Tech',
    stage: 'MVP',
    location: 'Chandigarh, India',
    ask: '₹25L',
    match: 94,
    initials: 'TL',
    color: 'bg-emerald-100 text-emerald-800',
    description: 'A circular-economy platform converting crop residue into sustainable packaging materials.',
    visibility: 'Access-controlled',
    founder: 'Aarav Sharma',
  }),
  createMockStartup({
    id: 2,
    name: 'Medora AI',
    tagline: 'Earlier signals. Better healthcare outcomes.',
    sector: 'HealthTech',
    stage: 'Early traction',
    location: 'Delhi, India',
    ask: '₹40L',
    match: 88,
    initials: 'MA',
    color: 'bg-violet-100 text-violet-800',
    description: 'AI-assisted workflows that help clinics identify patient follow-ups and care gaps.',
    visibility: 'Public',
    founder: 'Riya Kapoor',
  }),
  createMockStartup({
    id: 3,
    name: 'FarmSense',
    tagline: 'Practical intelligence for every farmer.',
    sector: 'AgriTech',
    stage: 'MVP',
    location: 'Ludhiana, India',
    ask: '₹15L',
    match: 86,
    initials: 'FS',
    color: 'bg-lime-100 text-lime-800',
    description: 'A multilingual farm companion combining crop insights, local weather, and market access.',
    visibility: 'Access-controlled',
    founder: 'Manmeet Singh',
  }),
  createMockStartup({
    id: 4,
    name: 'SkillSpring',
    tagline: 'Project-based learning for emerging talent.',
    sector: 'EdTech',
    stage: 'Validation',
    location: 'Pune, India',
    ask: '₹10L',
    match: 81,
    initials: 'SS',
    color: 'bg-sky-100 text-sky-800',
    description: 'A skills platform matching learners with practical projects from early-stage companies.',
    visibility: 'Public',
    founder: 'Ishita Rao',
  }),
  createMockStartup({
    id: 5,
    name: 'LedgerLeaf',
    tagline: 'Simple finance operations for small businesses.',
    sector: 'FinTech',
    stage: 'Idea',
    location: 'Jaipur, India',
    ask: '₹8L',
    match: 76,
    initials: 'LL',
    color: 'bg-amber-100 text-amber-800',
    description: 'A lightweight cash-flow and invoice workspace designed for small business owners.',
    visibility: 'Private',
    founder: 'Kabir Mehta',
  }),
  createMockStartup({
    id: 6,
    name: 'Gridwise',
    tagline: 'Make local energy systems work smarter.',
    sector: 'Clean Energy',
    stage: 'Early traction',
    location: 'Bengaluru, India',
    ask: '₹60L',
    match: 72,
    initials: 'GW',
    color: 'bg-orange-100 text-orange-800',
    description: 'Software for monitoring and optimizing distributed energy assets.',
    visibility: 'Public',
    founder: 'Neha Iyer',
  }),
];

export const investors: UiInvestor[] = [
  createMockInvestor({
    name: 'Northstar Ventures',
    sector: 'AgriTech · Climate Tech',
    stage: 'Pre-seed · Seed',
    ticket: '₹10L–₹50L',
    location: 'India',
    match: 96,
    initials: 'NV',
    color: 'bg-emerald-100 text-emerald-800',
  }),
  createMockInvestor({
    name: 'Aster Angel Network',
    sector: 'HealthTech · SaaS · AI',
    stage: 'Idea · MVP · Seed',
    ticket: '₹5L–₹25L',
    location: 'North India',
    match: 89,
    initials: 'AA',
    color: 'bg-violet-100 text-violet-800',
  }),
  createMockInvestor({
    name: 'Launchpad Capital',
    sector: 'SaaS · FinTech · EdTech',
    stage: 'MVP · Early traction',
    ticket: '₹20L–₹1Cr',
    location: 'India',
    match: 82,
    initials: 'LC',
    color: 'bg-sky-100 text-sky-800',
  }),
];

export const programs: UiProgram[] = [
  createMockProgram({
    name: 'Punjab Innovation Launchpad',
    org: 'Regional Incubation Network',
    sectors: 'AgriTech, Climate, AI',
    deadline: '15 Nov 2026',
    benefit: 'Mentorship · Prototyping · Demo day',
    status: 'Applications open',
  }),
  createMockProgram({
    name: 'Campus Founders Fellowship',
    org: 'University Innovation Hub',
    sectors: 'All sectors · Student founders',
    deadline: '30 Nov 2026',
    benefit: 'Founder coaching · ₹2L grant consideration',
    status: 'Applications open',
  }),
  createMockProgram({
    name: 'Climate Impact Accelerator',
    org: 'Green Futures Lab',
    sectors: 'Climate Tech, Clean Energy',
    deadline: '08 Dec 2026',
    benefit: 'Pilot partners · Impact advisory',
    status: 'Applications open',
  }),
];
