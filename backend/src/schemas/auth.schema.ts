import { z } from 'zod';

export const userRoleEnum = z.enum(['founder', 'investor', 'mentor', 'incubator', 'admin']);
export const userStatusEnum = z.enum(['active', 'suspended']);
export const verificationStatusEnum = z.enum(['pending', 'verified', 'rejected']);

export const registerSchema = z.object({
  email: z.string().email({ message: 'Valid email address required' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  full_name: z.string().min(2, { message: 'Full name must be at least 2 characters' }).max(100),
  role: userRoleEnum.default('founder'),
  is_student: z.boolean().default(false),
  organization: z.string().max(100).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  website: z.string().url({ message: 'Must be a valid URL' }).optional().nullable().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Valid email address required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  is_student: z.boolean().optional(),
  organization: z.string().max(100).optional().nullable(),
  avatar_url: z.string().url().optional().nullable().or(z.literal('')),
  bio: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
