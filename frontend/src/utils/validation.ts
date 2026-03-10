/**
 * utils/validation.ts
 *
 * Frontend Zod schemas mirroring backend validation.
 * Used by form components for client-side validation before submission.
 *
 * These are intentionally separate from the backend schemas:
 * - Frontend schemas can be more lenient (e.g. age accepts string input from <input>)
 * - Error messages are user-facing, not API-level
 */

import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ── Patient ───────────────────────────────────────────────────────────────────

export const createPatientSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^[0-9]{10,15}$/, 'Enter a valid 10-15 digit mobile number'),
  age: z
    .string()
    .min(1, 'Age is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 150, {
      message: 'Age must be a number between 0 and 150',
    }),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', ''])
    .optional()
    .default(''),
  address: z.string().max(300, 'Address too long').optional(),
});

export type CreatePatientFormValues = z.infer<typeof createPatientSchema>;

// ── Appointment booking ───────────────────────────────────────────────────────

export const bookingFormSchema = z.object({
  purpose: z.string().max(200, 'Purpose too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

// ── Doctor creation ───────────────────────────────────────────────────────────

export const createDoctorSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  department: z.string().min(1, 'Please select a department'),
  specialization: z.string().max(100, 'Specialization too long').optional(),
  slotDuration: z
    .number()
    .int()
    .min(5, 'Minimum 5 minutes')
    .max(60, 'Maximum 60 minutes')
    .default(15),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export type CreateDoctorFormValues = z.infer<typeof createDoctorSchema>;

// ── Receptionist creation ─────────────────────────────────────────────────────

export const createReceptionistSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export type CreateReceptionistFormValues = z.infer<typeof createReceptionistSchema>;

// ── Generic helper ────────────────────────────────────────────────────────────

/**
 * Validates data against a Zod schema and returns a flat error map.
 * Returns null if valid, or { field: errorMessage } if invalid.
 *
 * Usage:
 *   const errors = validateForm(loginSchema, formState);
 *   if (errors) { setErrors(errors); return; }
 */
export const validateForm = <T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  data: unknown
): Partial<Record<keyof T, string>> | null => {
  const result = schema.safeParse(data);
  if (result.success) return null;

  const errors: Partial<Record<string, string>> = {};
  for (const error of result.error.errors) {
    const field = error.path[0];
    if (field && !errors[String(field)]) {
      errors[String(field)] = error.message;
    }
  }
  return errors as Partial<Record<keyof T, string>>;
};
