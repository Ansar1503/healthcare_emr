import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

type RequestSection = 'body' | 'query' | 'params';

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

    (req as Record<string, unknown>)[section] = result.data;
    next();
  };

export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
