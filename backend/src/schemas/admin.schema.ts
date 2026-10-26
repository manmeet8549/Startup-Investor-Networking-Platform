import { z } from 'zod';
import { userRoleEnum, userStatusEnum, verificationStatusEnum } from './auth.schema.js';

export const updateUserStatusSchema = z.object({
  status: userStatusEnum.optional(),
  role: userRoleEnum.optional(),
  verification_status: verificationStatusEnum.optional(),
  reason: z.string().max(500).optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const reactivateUserSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const hideStartupSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listAdminStartupsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['all', 'visible', 'hidden']).default('all'),
  sector: z.string().optional(),
});

export const createReportSchema = z.object({
  target_type: z.enum(['startup', 'user', 'document', 'message', 'program', 'other']),
  target_id: z.string().min(1, 'Target ID is required'),
  reason: z.string().min(2, { message: 'Reason is required (min 2 characters)' }).max(1000),
  details: z.string().max(2000).optional().nullable(),
});

export const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']).optional(),
  target_type: z.string().optional(),
});

export const resolveReportSchema = z.object({
  resolution_notes: z.string().max(1000).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  status: z.enum(['reviewed', 'resolved', 'dismissed']).default('resolved'),
});

export const dismissReportSchema = z.object({
  resolution_notes: z.string().max(1000).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export const reviewReportSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'dismissed']).optional(),
  resolution_notes: z.string().max(1000).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  target_type: z.string().optional(),
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
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>;
export type HideStartupInput = z.infer<typeof hideStartupSchema>;
export type ListAdminStartupsQuery = z.infer<typeof listAdminStartupsQuerySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type DismissReportInput = z.infer<typeof dismissReportSchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ApproveVerificationInput = z.infer<typeof approveVerificationSchema>;
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListVerificationsQuery = z.infer<typeof listVerificationsQuerySchema>;
