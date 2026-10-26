import { z } from 'zod';
import { userRoleEnum, userStatusEnum, verificationStatusEnum } from './auth.schema.js';

export const updateUserStatusSchema = z.object({
  status: userStatusEnum.optional(),
  role: userRoleEnum.optional(),
  verification_status: verificationStatusEnum.optional(),
});

export const approveVerificationSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

export const rejectVerificationSchema = z.object({
  reason: z.string().min(2, { message: 'Rejection reason is required (min 2 characters)' }).max(500),
});

export const reviewVerificationSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  admin_notes: z.string().max(500).optional().nullable(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: userRoleEnum.optional(),
  status: userStatusEnum.optional(),
});

export const listVerificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: userRoleEnum.optional(),
  status: verificationStatusEnum.optional(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ApproveVerificationInput = z.infer<typeof approveVerificationSchema>;
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListVerificationsQuery = z.infer<typeof listVerificationsQuerySchema>;
