import { z } from 'zod';

export const pipelineStatusEnum = z.enum([
  'interested',
  'meeting_requested',
  'in_discussion',
  'passed',
  'follow_up',
]);

export const setPipelineStatusSchema = z.object({
  status: pipelineStatusEnum,
  notes: z.string().max(1000).optional(),
});

export const investorNoteSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty').max(5000),
});

export const createPitchRequestSchema = z.object({
  startup_id: z.string().min(1, 'startup_id is required'),
  proposed_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'proposed_date must be a valid ISO date string',
  }),
  message: z.string().min(1, 'Meeting request message cannot be empty').max(2000),
});

export const respondPitchRequestSchema = z.object({
  action: z.enum(['accept', 'decline', 'reschedule']),
  proposed_date: z.string().optional(),
  message: z.string().max(2000).optional(),
}).refine(
  (data) => {
    if (data.action === 'reschedule' && !data.proposed_date) {
      return false;
    }
    return true;
  },
  {
    message: 'proposed_date is required when proposing an alternative date (reschedule)',
    path: ['proposed_date'],
  }
);

export const pitchRequestMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty').max(2000),
  message_type: z.enum(['info_request', 'info_response', 'general']).default('info_request'),
});

export const createConnectionSchema = z.object({
  recipient_id: z.string().min(1, 'recipient_id is required'),
  message: z.string().max(1000).optional(),
});

export const respondConnectionSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export const sendMessageSchema = z.object({
  recipient_id: z.string().min(1).optional(),
  content: z.string().min(1, 'Message content cannot be empty').max(5000),
});

export type SetPipelineStatusInput = z.infer<typeof setPipelineStatusSchema>;
export type InvestorNoteInput = z.infer<typeof investorNoteSchema>;
export type CreatePitchRequestInput = z.infer<typeof createPitchRequestSchema>;
export type RespondPitchRequestInput = z.infer<typeof respondPitchRequestSchema>;
export type PitchRequestMessageInput = z.infer<typeof pitchRequestMessageSchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type RespondConnectionInput = z.infer<typeof respondConnectionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
