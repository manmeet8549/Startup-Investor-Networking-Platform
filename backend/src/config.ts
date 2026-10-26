import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string({ required_error: 'CORS_ORIGIN is required' }).min(1, 'CORS_ORIGIN is required').default('http://localhost:3000'),
  SUPABASE_URL: z.string({ required_error: 'SUPABASE_URL is required' }).url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string({ required_error: 'SUPABASE_ANON_KEY is required' }).min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string({ required_error: 'SUPABASE_SERVICE_ROLE_KEY is required' }).min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required' }).min(1, 'DATABASE_URL is required (Supabase pooler string with SSL)'),
  SUPABASE_JWT_SECRET: z.string().default('founders-den-jwt-secret-for-dev-and-tests'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    const message = `Environment validation failed:\n${errorDetails}`;
    throw new Error(message);
  }
  return result.data;
}

// In test environment, provide fallback defaults if env vars are not set
const defaultTestEnv: Record<string, unknown> = {
  NODE_ENV: 'test',
  PORT: 5000,
  CORS_ORIGIN: 'http://localhost:3000',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://fqbixskkrtlbvplchjjp.supabase.co',
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYml4c2trcnRsYnZwbGNoampwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzU4MjIsImV4cCI6MjEwODYxMTgyMn0.3a8PngSQEPWlRwRTqfzDZ-YSnACiqFI4PL_4rsjVSjY',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYml4c2trcnRsYnZwbGNoampwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzAzNTgyMiwiZXhwIjoyMTA4NjExODIyfQ.placeholder-service-role-key',
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://postgres:Mani%238549@db.fqbixskkrtlbvplchjjp.supabase.co:5432/postgres?sslmode=require',
  LOG_LEVEL: 'error',
};

let loadedConfig: EnvConfig;
try {
  loadedConfig = validateEnv(process.env.NODE_ENV === 'test' ? { ...defaultTestEnv, ...process.env } : process.env);
} catch (error) {
  console.error((error as Error).message);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
  loadedConfig = defaultTestEnv as EnvConfig;
}

export const config = loadedConfig;
