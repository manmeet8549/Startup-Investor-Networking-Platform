import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';
import { inMemoryDb, query } from '../db/index.js';
import { supabaseClient } from '../db/supabase.js';
import type { Profile } from '../db/types.js';
import { AppError } from './error.middleware.js';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: Profile;
    }
  }
}

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateToken(
  payload: { sub: string; email: string; role?: string },
  expiresIn: SignOptions['expiresIn'] = '7d'
): string {
  return jwt.sign(payload, config.SUPABASE_JWT_SECRET, { expiresIn });
}

export async function verifyAuthToken(token: string): Promise<{ userId: string; email?: string }> {
  // 1. Try local jwt.verify first (fast for integration tests / local tokens)
  try {
    const decoded = jwt.verify(token, config.SUPABASE_JWT_SECRET) as JwtPayload;
    if (decoded && decoded.sub) {
      return { userId: decoded.sub, email: decoded.email };
    }
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
    }
    // Fall through to verify with Supabase Auth
  }

  // 2. Validate with Supabase Auth API (handles ES256 tokens issued by Supabase GoTrue)
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data?.user) {
        return { userId: data.user.id, email: data.user.email };
      }
    } catch {
      // Fall through to error
    }
  }

  throw new AppError('Invalid authentication token', 401, 'UNAUTHORIZED');
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  let authInfo: { userId: string; email?: string };
  try {
    authInfo = await verifyAuthToken(token);
  } catch (err) {
    return next(err);
  }

  const userId = authInfo.userId;
  if (!userId) {
    return next(new AppError('Invalid token subject', 401, 'INVALID_TOKEN'));
  }

  // The role is always read from the database, never from the client or token
  let profile: Profile | null = null;

  if (!config.USE_IN_MEMORY_DB) {
    if (UUID_REGEX.test(userId)) {
      const res = await query<Profile>('SELECT * FROM public.profiles WHERE id = $1 LIMIT 1', [userId]);
      if (res.rows.length > 0) {
        profile = res.rows[0];
      }
    }
  } else {
    profile = inMemoryDb.getProfileById(userId);
  }

  if (!profile) {
    return next(new AppError('User profile not found in system', 401, 'USER_NOT_FOUND'));
  }

  if (profile.status === 'suspended') {
    return next(new AppError('This user account has been suspended', 403, 'ACCOUNT_SUSPENDED'));
  }

  req.user = profile;
  next();
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = undefined;
    return next();
  }

  const token = authHeader.split(' ')[1];

  let authInfo: { userId: string; email?: string };
  try {
    authInfo = await verifyAuthToken(token);
  } catch {
    req.user = undefined;
    return next();
  }

  const userId = authInfo.userId;
  if (!userId) {
    req.user = undefined;
    return next();
  }

  let profile: Profile | null = null;

  if (!config.USE_IN_MEMORY_DB) {
    if (UUID_REGEX.test(userId)) {
      const res = await query<Profile>('SELECT * FROM public.profiles WHERE id = $1 LIMIT 1', [userId]);
      if (res.rows.length > 0) {
        profile = res.rows[0];
      }
    }
  } else {
    profile = inMemoryDb.getProfileById(userId);
  }

  req.user = profile && profile.status !== 'suspended' ? profile : undefined;
  next();
}
