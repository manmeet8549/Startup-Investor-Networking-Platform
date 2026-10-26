import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Catch malformed JSON syntax error from express.json()
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status: unknown }).status === 400 &&
    'body' in err
  ) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON payload in request body',
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: formattedErrors,
      },
    });
    return;
  }

  // Handle Multer upload errors
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'MulterError') {
    const multerErr = err as unknown as { code: string; message: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit',
        },
      });
      return;
    }
    res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: multerErr.message,
      },
    });
    return;
  }

  logger.error(
    { err, path: req.path, method: req.method, requestId: (req as any).id },
    'Unhandled internal server error'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
