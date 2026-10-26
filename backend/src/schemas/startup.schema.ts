import { z } from 'zod';

export const startupStageEnum = z.enum([
  'idea',
  'validation',
  'mvp',
  'early_traction',
  'growth',
]);

export const visibilityEnum = z.enum(['public', 'access_controlled', 'private']);

export const createStartupSchema = z.object({
  name: z.string().min(1, 'Startup name is required'),
  tagline: z.string().min(1, 'Tagline is required'),
  description: z.string().optional(),
  sectors: z.array(z.string()).min(1, 'At least one sector is required').default([]),
  stage: startupStageEnum.default('idea'),
  location: z.string().min(1, 'Location is required'),
  funding_ask: z.number().min(0, 'Funding ask cannot be negative').default(0),
  currency: z.string().default('INR'),
  visibility: visibilityEnum.default('access_controlled'),
  logo: z.string().optional().nullable(),
  problem: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  target_market: z.string().optional().nullable(),
  business_model: z.string().optional().nullable(),
  pitch_deck_url: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
});

export const updateStartupSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().min(1).optional(),
  description: z.string().optional(),
  sectors: z.array(z.string()).optional(),
  stage: startupStageEnum.optional(),
  location: z.string().min(1).optional(),
  funding_ask: z.number().min(0).optional(),
  currency: z.string().optional(),
  visibility: visibilityEnum.optional(),
  logo: z.string().optional().nullable(),
  problem: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  target_market: z.string().optional().nullable(),
  business_model: z.string().optional().nullable(),
  pitch_deck_url: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
});

export const teamMemberSchema = z.object({
  name: z.string().min(1, 'Team member name is required'),
  role_title: z.string().min(1, 'Role title is required'),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  user_id: z.string().uuid().optional().nullable(),
  is_primary: z.boolean().default(false),
});

export const updateTeamMemberSchema = teamMemberSchema.partial();

export const createDocumentAccessRequestSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const reviewDocumentAccessRequestSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const startupFilterSchema = z.object({
  q: z.string().optional(),
  sector: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val;
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }),
  stage: startupStageEnum.optional(),
  location: z.string().optional(),
  funding_min: z.coerce.number().min(0).optional(),
  funding_max: z.coerce.number().min(0).optional(),
  business_model: z.string().optional(),
  sort: z.enum(['newest', 'funding', 'relevance']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateStartupInput = z.infer<typeof createStartupSchema>;
export type UpdateStartupInput = z.infer<typeof updateStartupSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type StartupFilterQuery = z.infer<typeof startupFilterSchema>;

