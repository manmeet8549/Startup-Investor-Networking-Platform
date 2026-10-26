import { z } from 'zod';

// ==========================================
// 1. MENTORSHIP SCHEMAS
// ==========================================

export const createMentorshipRequestSchema = z.object({
  mentor_id: z.string().min(1, 'Mentor ID is required'),
  startup_id: z.string().min(1).optional().nullable(),
  topic: z.string().max(100).optional().default('General Mentorship'),
  message: z.string().min(3, 'Message must be at least 3 characters').max(1000),
  goals: z.array(z.string()).optional(),
});

export const respondMentorshipRequestSchema = z
  .object({
    action: z.enum(['accept', 'decline', 'approve', 'reject']).optional(),
    status: z.enum(['accepted', 'declined', 'approved', 'rejected']).optional(),
    response_note: z.string().max(1000).optional().nullable(),
  })
  .refine((data) => data.action || data.status, {
    message: 'Either action or status is required',
  });

export const createMentorFeedbackSchema = z.object({
  feedback: z.string().min(5, 'Feedback must be at least 5 characters').max(2000),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  mentorship_request_id: z.string().min(1).optional().nullable(),
  strengths: z.array(z.string()).optional(),
  areas_for_improvement: z.array(z.string()).optional(),
});

// ==========================================
// 2. INCUBATOR PROGRAM SCHEMAS
// ==========================================

export const createProgramSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(150).optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(150).optional(),
    description: z.string().min(5, 'Description must be at least 5 characters').max(2000).optional(),
    eligibility: z.string().max(2000).optional(),
    benefits: z.string().min(5, 'Benefits must be at least 5 characters').max(2000),
    sectors: z.array(z.string()).optional().default(['General']),
    stages: z.array(z.string()).optional().default([]),
    deadline: z.string().refine((d) => !isNaN(Date.parse(d)), {
      message: 'Invalid deadline format. Must be an ISO date or datetime string.',
    }),
  })
  .refine((data) => data.title || data.name, {
    message: 'Either title or name is required',
    path: ['title'],
  });

export const updateProgramSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  name: z.string().min(2).max(150).optional(),
  description: z.string().min(5).max(2000).optional(),
  eligibility: z.string().max(2000).optional(),
  benefits: z.string().min(5).max(2000).optional(),
  sectors: z.array(z.string()).min(1).optional(),
  stages: z.array(z.string()).optional(),
  deadline: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), {
      message: 'Invalid deadline format.',
    })
    .optional(),
  is_active: z.boolean().optional(),
});

// ==========================================
// 3. APPLICATION SCHEMAS
// ==========================================

export const applyProgramSchema = z.object({
  startup_id: z.string().min(1, 'Startup ID is required'),
  pitch_summary: z.string().max(2000).optional().nullable(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'], {
    errorMap: () => ({ message: 'Invalid application status' }),
  }),
  decision_notes: z.string().max(1000).optional().nullable(),
});
