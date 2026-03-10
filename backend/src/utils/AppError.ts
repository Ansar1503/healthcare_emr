/**
 * Domain error with an HTTP status code.
 * Replace ad-hoc `Object.assign(new Error(), { statusCode })` patterns.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Restore the prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundError = (resource: string): AppError =>
  new AppError(`${resource} not found`, 404);

export const unauthorizedError = (msg = 'Authentication required'): AppError =>
  new AppError(msg, 401);

export const forbiddenError = (msg = 'Access denied'): AppError =>
  new AppError(msg, 403);

export const badRequestError = (msg: string): AppError =>
  new AppError(msg, 400);

export const conflictError = (msg: string): AppError =>
  new AppError(msg, 409);
