import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../db/types.js';
import { AppError } from './error.middleware.js';

export function requireRole(...allowedRoles: (UserRole | UserRole[])[]) {
  const flattened: UserRole[] = allowedRoles.flat();

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!flattened.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: required role ${flattened.join(' or ')}, but user is ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

export function requireVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  if (req.user.verification_status !== 'verified') {
    return next(
      new AppError(
        'Your account is pending admin verification. Access is restricted until approved.',
        403,
        'UNVERIFIED_ACCOUNT'
      )
    );
  }

  next();
}
