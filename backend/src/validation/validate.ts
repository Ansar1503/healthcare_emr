/**
 * validation/validate.ts
 *
 * Generic Zod middleware factory.
 * Keeps validation completely decoupled from controllers and services.
 * Architecture: validation happens at the route layer before hitting the controller.
 */

import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

type RequestSection = 'body' | 'query' | 'params';

/**
 * Creates an Express middleware that validates a section of the request
 * using the provided Zod schema.
 *
 * On failure it sends a 400 with the structured error format:
 * { success: false, message: "Validation error", errors: [...] }
 *
 * On success it replaces the validated section with the parsed/coerced data
 * (so controllers always receive clean, typed data).
 */
export const validate =
  (schema: ZodSchema, section: RequestSection = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[section]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.') || 'unknown',
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
      return;
    }

    // Replace with parsed (coerced + defaulted) data so downstream is clean
    (req as Record<string, unknown>)[section] = result.data;
    next();
  };

/**
 * Convenience wrappers for common use cases
 */
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
