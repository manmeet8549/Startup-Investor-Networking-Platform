import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { inMemoryDb, query } from '../db/index.js';
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

import type { SignOptions } from 'jsonwebtoken';

export function generateToken(
  payload: { sub: string; email: string; role?: string },
  expiresIn: SignOptions['expiresIn'] = '7d'
): string {
  return jwt.sign(payload, config.SUPABASE_JWT_SECRET, { expiresIn });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.SUPABASE_JWT_SECRET) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token', 401, 'UNAUTHORIZED'));
  }

  const userId = decoded.sub;
  if (!userId) {
    return next(new AppError('Invalid token subject', 401, 'INVALID_TOKEN'));
  }

  // The role is always read from the database, never from the client or token
  let profile: Profile | null = null;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Profile>('SELECT * FROM public.profiles WHERE id = $1 LIMIT 1', [userId]);
    if (res.rows.length > 0) {
      profile = res.rows[0];
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

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.SUPABASE_JWT_SECRET) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token', 401, 'UNAUTHORIZED'));
  }

  const userId = decoded.sub;
  if (!userId) {
    return next(new AppError('Invalid token subject', 401, 'INVALID_TOKEN'));
  }

  let profile: Profile | null = null;

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    const res = await query<Profile>('SELECT * FROM public.profiles WHERE id = $1 LIMIT 1', [userId]);
    if (res.rows.length > 0) {
      profile = res.rows[0];
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

