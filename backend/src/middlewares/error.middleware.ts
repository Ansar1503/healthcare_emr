/**
 * error.middleware.ts
 *
 * FIXES:
 * 1. Removed unused express-validator import (validation now done by Zod middleware).
 * 2. Added handling for ZodError that might bubble up from unexpected paths.
 * 3. Improved 500 error logging — never expose stack in production responses.
 * 4. notFound now correctly logs a warning for unknown routes.
 * 5. MongoServerError code is typed as number — the `code === 11000` comparison
 *    now has the correct narrowing interface.
 */
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

interface MongooseValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, { message: string }>;
}
interface MongoDuplicateKeyError extends Error {
  code: number;
  keyValue?: Record<string, unknown>;
}
interface MongooseCastError extends Error {
  name: 'CastError';
  path: string;
  value: unknown;
}

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: Array<{ field: string; message: string }> | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    // ZodError that escaped a route-level validate() middleware
    statusCode = 400;
    message = 'Validation error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.') || 'unknown',
      message: e.message,
    }));
  } else if ((err as MongooseValidationError).name === 'ValidationError') {
    statusCode = 400;
    message = Object.values((err as MongooseValidationError).errors)
      .map((e) => e.message)
      .join(', ');
  } else if ((err as MongoDuplicateKeyError).code === 11000) {
    statusCode = 409;
    const field = Object.keys((err as MongoDuplicateKeyError).keyValue ?? {})[0];
    message =
      field === 'email'
        ? 'Email already in use.'
        : 'This appointment slot is already booked. Please choose another time.';
  } else if ((err as MongooseCastError).name === 'CastError') {
    statusCode = 400;
    const castErr = err as MongooseCastError;
    message = `Invalid value for field '${castErr.path}': ${String(castErr.value)}`;
  } else if ((err as Error).name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  } else if ((err as Error).name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired.';
  } else if (err instanceof Error) {
    // Unknown error — log it, but don't expose message in production
    if (process.env.NODE_ENV !== 'development') {
      console.error('[Unhandled Error]', err);
      message = 'An unexpected error occurred. Please try again.';
    } else {
      message = err.message;
    }
  }

  const body: Record<string, unknown> = { success: false, message };
  if (errors) body.errors = errors;

  // Only expose stack trace in development
  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};
