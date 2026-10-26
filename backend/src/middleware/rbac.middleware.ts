import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../db/types.js';
import { AppError } from './error.middleware.js';

export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!rolesArray.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: required role ${rolesArray.join(' or ')}, but user is ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
