import type { Types } from 'mongoose';

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type UserRole = 'super_admin' | 'doctor' | 'receptionist';

export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type Gender = 'male' | 'female' | 'other';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | '';

export type Department =
  | 'General Medicine'
  | 'Cardiology'
  | 'Orthopedics'
  | 'Pediatrics'
  | 'Gynecology'
  | 'Neurology'
  | 'Dermatology'
  | 'Ophthalmology'
  | 'ENT'
  | 'Psychiatry'
  | 'Radiology'
  | 'Oncology'
  | 'Urology'
  | 'Nephrology'
  | 'Gastroenterology';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_DOCTOR'
  | 'UPDATE_DOCTOR'
  | 'DELETE_DOCTOR'
  | 'CREATE_RECEPTIONIST'
  | 'UPDATE_RECEPTIONIST'
  | 'DELETE_RECEPTIONIST'
  | 'CREATE_PATIENT'
  | 'UPDATE_PATIENT'
  | 'DELETE_PATIENT'
  | 'CREATE_APPOINTMENT'
  | 'UPDATE_APPOINTMENT'
  | 'DELETE_APPOINTMENT'
  | 'MARK_ARRIVED'
  | 'MARK_COMPLETED'
  | 'VIEW_APPOINTMENTS'
  | 'GENERATE_SLOTS';

// ─────────────────────────────────────────────
// Subdocument interfaces
// ─────────────────────────────────────────────

export interface IBreakPeriod {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface IWorkingHours {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

// ─────────────────────────────────────────────
// Document interfaces (plain shape, no Mongoose overhead)
// ─────────────────────────────────────────────

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  doctorId: Types.ObjectId | null;
  isActive: boolean;
  refreshToken: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDoctor {
  _id: Types.ObjectId;
  name: string;
  department: Department;
  specialization?: string;
  slotDuration: number;
  workingHours: IWorkingHours;
  breaks: IBreakPeriod[];
  workingDays: number[];
  isActive: boolean;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatient {
  _id: Types.ObjectId;
  name: string;
  mobile: string;
  age: number;
  gender: Gender;
  bloodGroup: BloodGroup;
  address?: string;
  medicalHistory?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppointment {
  _id: Types.ObjectId;
  doctor: Types.ObjectId;
  patient: Types.ObjectId;
  date: string;       // "YYYY-MM-DD"
  slotStart: string;  // "HH:MM"
  slotEnd: string;    // "HH:MM"
  status: AppointmentStatus;
  purpose?: string;
  notes?: string;
  arrivedAt?: Date;
  completedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userRole: UserRole;
  action: AuditAction;
  entity?: string;
  entityId?: Types.ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────
// Populated variants (used in query results)
// ─────────────────────────────────────────────

export interface IAppointmentPopulated extends Omit<IAppointment, 'doctor' | 'patient' | 'createdBy'> {
  doctor: Pick<IDoctor, '_id' | 'name' | 'department'>;
  patient: Pick<IPatient, '_id' | 'name' | 'mobile' | 'age' | 'gender'>;
  createdBy: Pick<IUser, '_id' | 'name' | 'role'>;
}

// ─────────────────────────────────────────────
// JWT payload
// ─────────────────────────────────────────────

export interface IJwtPayload {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  doctorId?: string;
}

// ─────────────────────────────────────────────
// Request augmentation
// ─────────────────────────────────────────────

export interface IAuthUser {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  doctorId: string | null;
}

// ─────────────────────────────────────────────
// Slot types
// ─────────────────────────────────────────────

export type SlotStatus = 'available' | 'booked' | 'break' | 'past';

export interface ISlot {
  slotStart: string;
  slotEnd: string;
  isAvailable: boolean;
  status: SlotStatus;
}

export interface ISlotStats {
  total: number;
  available: number;
  booked: number;
  break: number;
  past: number;
}

export interface ISlotValidationResult {
  valid: boolean;
  reason?: string;
}

// ─────────────────────────────────────────────
// Repository filter / pagination types
// ─────────────────────────────────────────────

export interface IPaginationOptions {
  page: number;
  limit: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IAppointmentFilters {
  doctorId?: string;
  date?: string;
  status?: AppointmentStatus;
  patientId?: string;
}

export interface IPatientSearchFilters {
  query: string;
}

// ─────────────────────────────────────────────
// Service input DTOs
// ─────────────────────────────────────────────

export interface ICreateAppointmentDTO {
  doctorId: string;
  patientId: string;
  date: string;
  slotStart: string;
  purpose?: string;
  notes?: string;
}

export interface IUpdateAppointmentDTO {
  purpose?: string;
  notes?: string;
  status?: AppointmentStatus;
}

export interface ICreateDoctorDTO {
  name: string;
  department: Department;
  specialization?: string;
  slotDuration?: number;
  workingHours?: IWorkingHours;
  breaks?: IBreakPeriod[];
  workingDays?: number[];
  email: string;
  password: string;
}

export interface ICreatePatientDTO {
  name: string;
  mobile: string;
  age: number;
  gender: Gender;
  bloodGroup?: BloodGroup;
  address?: string;
  medicalHistory?: string;
}

export interface ICreateUserDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  doctorId?: string;
}

export interface IAuditLogDTO {
  userId: Types.ObjectId | string;
  userRole: UserRole;
  action: AuditAction;
  entity?: string;
  entityId?: Types.ObjectId | string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────────
// API Response envelope
// ─────────────────────────────────────────────

export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface IApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
}
