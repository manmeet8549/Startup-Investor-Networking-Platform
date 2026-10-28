import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required').default('http://localhost:3000'),
    SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
    SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
    DATABASE_URL: z.string().optional().default(''),
    USE_IN_MEMORY_DB: z
      .union([z.boolean(), z.string()])
      .transform((val) => val === true || val === 'true')
      .default(false),
    DATABASE_MODE: z.enum(['postgres', 'in-memory']).optional(),
    SUPABASE_JWT_SECRET: z.string().optional().default('founders-den-jwt-secret-for-dev-and-tests'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((data, ctx) => {
    const isProduction = data.NODE_ENV === 'production';
    const isInMemory = data.USE_IN_MEMORY_DB === true || data.DATABASE_MODE === 'in-memory';

    if (isProduction) {
      if (isInMemory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'USE_IN_MEMORY_DB cannot be true in production mode.',
          path: ['USE_IN_MEMORY_DB'],
        });
      }
      if (!data.DATABASE_URL || data.DATABASE_URL.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'DATABASE_URL is required in production mode.',
          path: ['DATABASE_URL'],
        });
      }
      if (!data.CORS_ORIGIN || data.CORS_ORIGIN.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGIN is required in production mode.',
          path: ['CORS_ORIGIN'],
        });
      }
    } else if (!isInMemory && (!data.DATABASE_URL || data.DATABASE_URL.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL is required to start the application in postgres mode. Set DATABASE_URL or set USE_IN_MEMORY_DB=true for offline testing.',
        path: ['DATABASE_URL'],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema> & {
  dbMode: 'postgres' | 'in-memory';
};

export function validateEnv(rawEnv: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  const issues: any[] = result.success ? [] : [...(result.error.issues || (result.error as any).errors || [])];

  const isProduction = rawEnv.NODE_ENV === 'production';
  const isInMemory =
    rawEnv.USE_IN_MEMORY_DB === true ||
    rawEnv.USE_IN_MEMORY_DB === 'true' ||
    rawEnv.DATABASE_MODE === 'in-memory';

  if (isProduction && isInMemory) {
    if (!issues.some((i: any) => i.path?.join('.') === 'USE_IN_MEMORY_DB')) {
      issues.push({
        path: ['USE_IN_MEMORY_DB'],
        message: 'USE_IN_MEMORY_DB cannot be true in production mode.',
      });
    }
  }

  const requiredInProd = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGIN'];
  if (isProduction) {
    for (const key of requiredInProd) {
      const val = rawEnv[key];
      if (!val || (typeof val === 'string' && val.trim() === '')) {
        if (!issues.some((i: any) => i.path?.join('.') === key)) {
          issues.push({
            path: [key],
            message: `${key} is required in production mode.`,
          });
        }
      }
    }
  }

  const dbUrl = rawEnv.DATABASE_URL;
  if (!isInMemory && (!dbUrl || (typeof dbUrl === 'string' && dbUrl.trim() === ''))) {
    if (!issues.some((i: any) => i.path?.join('.') === 'DATABASE_URL')) {
      issues.push({
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required to start the application in postgres mode. Set DATABASE_URL or set USE_IN_MEMORY_DB=true for offline testing.',
      });
    }
  }

  if (issues.length > 0) {
    const errorDetails = issues
      .map((err: any) => {
        const field = err.path.join('.');
        if (err.message?.includes('undefined') || err.code === 'invalid_type') {
          return `  - ${field}: ${field} is required`;
        }
        return `  - ${field}: ${err.message}`;
      })
      .join('\n');
    const message = `Environment validation failed:\n${errorDetails}`;
    throw new Error(message);
  }

  const data = result.data!;

  return {
    ...data,
    dbMode: isInMemory ? 'in-memory' : 'postgres',
  };
}

// In test environment, provide fallback defaults if env vars are not set
const defaultTestEnv: Record<string, unknown> = {
  NODE_ENV: 'test',
  PORT: 5000,
  CORS_ORIGIN: 'http://localhost:3000',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://tdvvdkobcgfrvotzdcor.supabase.co',
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkdnZka29iY2dmcnZvdHpkY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNDM1MDgsImV4cCI6MjEwODYxOTUwOH0.diVYXcVW9GEeoCTFfUou4lOf5NixS3ODsAHN3D8_OIQ',
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkdnZka29iY2dmcnZvdHpkY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNDM1MDgsImV4cCI6MjEwODYxOTUwOH0.diVYXcVW9GEeoCTFfUou4lOf5NixS3ODsAHN3D8_OIQ',
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://postgres:Wpsonly%40085490@db.tdvvdkobcgfrvotzdcor.supabase.co:5432/postgres',
  USE_IN_MEMORY_DB: process.env.USE_IN_MEMORY_DB === 'true' || process.env.DATABASE_MODE === 'in-memory',
  DATABASE_MODE: process.env.DATABASE_MODE,
  LOG_LEVEL: 'error',
};

let loadedConfig: EnvConfig;
try {
  loadedConfig = validateEnv(process.env.NODE_ENV === 'test' ? { ...defaultTestEnv, ...process.env } : process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

export const config = loadedConfig;
