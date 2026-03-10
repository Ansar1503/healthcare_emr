// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'doctor' | 'receptionist';

export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type Gender = 'male' | 'female' | 'other';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | '';

export type SlotStatus = 'available' | 'booked' | 'break' | 'past';

// ── Core entities ─────────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  doctorId?: string | null;
  isActive?: boolean;
}

export interface IDoctor {
  _id: string;
  name: string;
  department: string;
  specialization?: string;
  slotDuration: number;
  workingHours: { startTime: string; endTime: string };
  breaks?: Array<{ startTime: string; endTime: string }>;
  workingDays?: number[];
  isActive: boolean;
}

export interface IPatient {
  _id: string;
  name: string;
  mobile: string;
  age: number;
  gender: Gender;
  bloodGroup?: BloodGroup;
  address?: string;
  medicalHistory?: string;
}

export interface IAppointment {
  _id: string;
  doctor: { _id: string; name: string; department: string };
  patient: { _id: string; name: string; mobile: string; age: number; gender: Gender };
  date: string;
  slotStart: string;
  slotEnd: string;
  status: AppointmentStatus;
  purpose?: string;
  notes?: string;
  arrivedAt?: string;
  createdAt: string;
}

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

// ── API responses ─────────────────────────────────────────────────────────────

export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface IPaginatedData<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Auth state ────────────────────────────────────────────────────────────────

export interface IAuthState {
  user: IUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: IUser; accessToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string };

// ── Service DTOs ──────────────────────────────────────────────────────────────

export interface ILoginDTO {
  email: string;
  password: string;
}

export interface ICreateAppointmentDTO {
  doctorId: string;
  patientId: string;
  date: string;
  slotStart: string;
  purpose?: string;
  notes?: string;
}

export interface ICreatePatientDTO {
  name: string;
  mobile: string;
  age: number | string;
  gender: Gender | '';
  bloodGroup?: BloodGroup;
  address?: string;
}

export interface ICreateDoctorDTO {
  name: string;
  department: string;
  specialization?: string;
  slotDuration?: number;
  workingHours?: { startTime: string; endTime: string };
  email: string;
  password: string;
}

// ── Slot page state ───────────────────────────────────────────────────────────

export interface ISlotPageData {
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  slotDuration: number;
  workingHours: { startTime: string; endTime: string };
  slots: ISlot[];
  stats: ISlotStats;
  message?: string;
}

// ── Booking navigation state ──────────────────────────────────────────────────

export interface IBookingNavState {
  doctorId: string;
  doctorName: string;
  date: string;
  slot: ISlot;
}
