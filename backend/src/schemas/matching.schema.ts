import { z } from 'zod';

export const investorPreferencesSchema = z
  .object({
    sectors: z.array(z.string().min(1)).min(1, 'At least one sector preference is required'),
    stages: z.array(z.string().min(1)).min(1, 'At least one stage preference is required'),
    ticket_min: z.number().nonnegative('ticket_min must be greater than or equal to 0'),
    ticket_max: z.number().nonnegative('ticket_max must be greater than or equal to 0'),
    regions: z.array(z.string()).default([]),
    business_models: z.array(z.string()).default([]),
    thesis: z.string().nullable().optional(),
    firm_name: z.string().nullable().optional(),
  })
  .refine((data) => data.ticket_max >= data.ticket_min, {
    message: 'ticket_max must be greater than or equal to ticket_min',
    path: ['ticket_max'],
  });

export type InvestorPreferencesInput = z.infer<typeof investorPreferencesSchema>;

export const matchInvestorsQuerySchema = z.object({
  startup_id: z.string().min(1, 'startup_id is required'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

export type MatchInvestorsQuery = z.infer<typeof matchInvestorsQuerySchema>;

export const matchStartupsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

export type MatchStartupsQuery = z.infer<typeof matchStartupsQuerySchema>;
