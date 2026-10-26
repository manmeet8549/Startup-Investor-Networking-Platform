import { z } from 'zod';

export const founderProfileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  is_student: z.boolean().optional(),
  organization: z.string().max(100).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
});

export const investorProfileUpdateSchema = z.object({
  investment_thesis: z.string().max(1000).optional().nullable(),
  ticket_size_min: z.coerce.number().min(0).optional(),
  ticket_size_max: z.coerce.number().min(0).optional(),
  preferred_sectors: z.array(z.string()).optional(),
  preferred_stages: z.array(z.string()).optional(),
  preferred_locations: z.array(z.string()).optional(),
});

export const mentorProfileUpdateSchema = z.object({
  expertise_areas: z.array(z.string()).optional(),
  years_of_experience: z.coerce.number().int().min(0).max(70).optional(),
  mentoring_topics: z.array(z.string()).optional(),
  linkedin_url: z.string().url().optional().nullable().or(z.literal('')),
});

export const incubatorProfileUpdateSchema = z.object({
  organization_name: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  program_types: z.array(z.string()).optional(),
  cohort_size: z.coerce.number().int().min(0).optional(),
});

export type FounderProfileUpdateInput = z.infer<typeof founderProfileUpdateSchema>;
export type InvestorProfileUpdateInput = z.infer<typeof investorProfileUpdateSchema>;
export type MentorProfileUpdateInput = z.infer<typeof mentorProfileUpdateSchema>;
export type IncubatorProfileUpdateInput = z.infer<typeof incubatorProfileUpdateSchema>;
