import { z } from "zod";
import mongoose from "mongoose";

const objectId = () =>
  z
    .string({ required_error: "ID is required" })
    .refine((v) => mongoose.isValidObjectId(v), {
      message: "Invalid ObjectId format",
    });

const timeHHMM = () =>
  z
    .string()
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "Time must be in HH:MM 24-hour format (e.g. 09:30)",
    );

const dateYYYYMMDD = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((v) => !isNaN(Date.parse(v)), {
      message: "Date is not a real calendar date",
    });

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Must be a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const breakPeriodSchema = z
  .object({
    startTime: timeHHMM(),
    endTime: timeHHMM(),
  })
  .refine((b) => b.startTime < b.endTime, {
    message: "Break start time must be before end time",
    path: ["endTime"],
  });

const workingHoursSchema = z
  .object({
    startTime: timeHHMM(),
    endTime: timeHHMM(),
  })
  .refine((w) => w.startTime < w.endTime, {
    message: "Working start time must be before end time",
    path: ["endTime"],
  });

export const createDoctorSchema = z.object({
  name: z
    .string({ required_error: "Doctor name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  department: z.enum(
    [
      "General Medicine",
      "Cardiology",
      "Orthopedics",
      "Pediatrics",
      "Gynecology",
      "Neurology",
      "Dermatology",
      "Ophthalmology",
      "ENT",
      "Psychiatry",
      "Radiology",
      "Oncology",
      "Urology",
      "Nephrology",
      "Gastroenterology",
    ],
    { errorMap: () => ({ message: "Invalid department" }) },
  ),
  specialization: z.string().trim().max(100).optional(),
  slotDuration: z
    .number({ invalid_type_error: "Slot duration must be a number" })
    .int("Slot duration must be an integer")
    .min(5, "Minimum slot duration is 5 minutes")
    .max(60, "Maximum slot duration is 60 minutes")
    .default(15),
  workingHours: workingHoursSchema.default({
    startTime: "09:00",
    endTime: "17:00",
  }),
  breaks: z.array(breakPeriodSchema).default([]),
  workingDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "At least one working day is required")
    .default([1, 2, 3, 4, 5]),
  email: z
    .string({ required_error: "Login email is required" })
    .email("Must be a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    department: z
      .enum([
        "General Medicine",
        "Cardiology",
        "Orthopedics",
        "Pediatrics",
        "Gynecology",
        "Neurology",
        "Dermatology",
        "Ophthalmology",
        "ENT",
        "Psychiatry",
        "Radiology",
        "Oncology",
        "Urology",
        "Nephrology",
        "Gastroenterology",
      ])
      .optional(),
    specialization: z.string().trim().max(100).optional(),
    slotDuration: z.number().int().min(5).max(60).optional(),
    workingHours: workingHoursSchema.optional(),
    breaks: z.array(breakPeriodSchema).optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const createPatientSchema = z.object({
  name: z
    .string({ required_error: "Patient name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  mobile: z
    .string({ required_error: "Mobile number is required" })
    .trim()
    .regex(
      /^[0-9]{10,15}$/,
      "Mobile must be 10–15 digits with no spaces or symbols",
    ),
  age: z
    .number({
      required_error: "Age is required",
      invalid_type_error: "Age must be a number",
    })
    .int("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(150, "Age cannot exceed 150"),
  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Gender must be male, female, or other" }),
  }),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", ""])
    .optional()
    .default(""),
  address: z
    .string()
    .trim()
    .max(300, "Address cannot exceed 300 characters")
    .optional(),
  medicalHistory: z
    .string()
    .trim()
    .max(1000, "Medical history cannot exceed 1000 characters")
    .optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial().strict();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const createAppointmentSchema = z.object({
  doctorId: objectId(),
  patientId: objectId(),
  date: dateYYYYMMDD(),
  slotStart: timeHHMM(),
  purpose: z
    .string()
    .trim()
    .max(200, "Purpose cannot exceed 200 characters")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z
  .object({
    purpose: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
    status: z
      .enum(["booked", "arrived", "completed", "cancelled", "no_show"], {
        errorMap: () => ({ message: "Invalid appointment status" }),
      })
      .optional(),
  })
  .strict();

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const slotQuerySchema = z.object({
  doctorId: objectId(),
  date: dateYYYYMMDD(),
});

export type SlotQueryInput = z.infer<typeof slotQuerySchema>;

export const createReceptionistSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .email("Must be a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export type CreateReceptionistInput = z.infer<typeof createReceptionistSchema>;

export const appointmentQuerySchema = z.object({
  doctorId: z
    .string()
    .optional()
    .refine((v) => !v || mongoose.isValidObjectId(v), {
      message: "doctorId must be a valid ObjectId",
    }),
  patientId: z
    .string()
    .optional()
    .refine((v) => !v || mongoose.isValidObjectId(v), {
      message: "patientId must be a valid ObjectId",
    }),
  date: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "date must be YYYY-MM-DD",
    }),
  status: z
    .enum(["booked", "arrived", "completed", "cancelled", "no_show"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AppointmentQueryInput = z.infer<typeof appointmentQuerySchema>;
