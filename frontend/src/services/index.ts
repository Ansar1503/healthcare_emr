import api from './api';
import type {
  IApiResponse,
  IAppointment,
  IDoctor,
  IPatient,
  ISlotPageData,
  IUser,
  IPaginatedData,
  ILoginDTO,
  ICreateAppointmentDTO,
  ICreatePatientDTO,
  ICreateDoctorDTO,
} from '../types';
import type { AxiosResponse } from 'axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  login: (dto: ILoginDTO): Promise<AxiosResponse<IApiResponse<{ accessToken: string; user: IUser }>>> =>
    api.post('/auth/login', dto),

  logout: (): Promise<AxiosResponse<IApiResponse>> =>
    api.post('/auth/logout'),

  getMe: (): Promise<AxiosResponse<IApiResponse<IUser>>> =>
    api.get('/auth/me'),
};

// ── Doctors ───────────────────────────────────────────────────────────────────
export const doctorService = {
  getAll: (params?: Record<string, unknown>): Promise<AxiosResponse<IApiResponse<IDoctor[]>>> =>
    api.get('/doctors', { params }),

  getById: (id: string): Promise<AxiosResponse<IApiResponse<IDoctor>>> =>
    api.get(`/doctors/${id}`),

  create: (dto: ICreateDoctorDTO): Promise<AxiosResponse<IApiResponse<{ doctor: IDoctor; user: Pick<IUser, 'id' | 'email'> }>>> =>
    api.post('/doctors', dto),

  update: (id: string, data: Partial<IDoctor>): Promise<AxiosResponse<IApiResponse<IDoctor>>> =>
    api.put(`/doctors/${id}`, data),
};

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientService = {
  search: (
    q: string,
    page = 1
  ): Promise<AxiosResponse<IApiResponse<IPaginatedData<IPatient>>>> =>
    api.get('/patients/search', { params: { q, page } }),

  getById: (id: string): Promise<AxiosResponse<IApiResponse<IPatient>>> =>
    api.get(`/patients/${id}`),

  create: (dto: ICreatePatientDTO): Promise<AxiosResponse<IApiResponse<IPatient>>> =>
    api.post('/patients', dto),

  update: (id: string, data: Partial<IPatient>): Promise<AxiosResponse<IApiResponse<IPatient>>> =>
    api.put(`/patients/${id}`, data),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentService = {
  getAll: (
    params: Record<string, string | number | undefined>
  ): Promise<AxiosResponse<IApiResponse<IPaginatedData<IAppointment>>>> =>
    api.get('/appointments', { params }),

  create: (
    dto: ICreateAppointmentDTO
  ): Promise<AxiosResponse<IApiResponse<IAppointment>>> =>
    api.post('/appointments', dto),

  update: (
    id: string,
    data: Partial<IAppointment>
  ): Promise<AxiosResponse<IApiResponse<IAppointment>>> =>
    api.put(`/appointments/${id}`, data),

  delete: (id: string): Promise<AxiosResponse<IApiResponse>> =>
    api.delete(`/appointments/${id}`),

  markArrived: (id: string): Promise<AxiosResponse<IApiResponse<IAppointment>>> =>
    api.post(`/appointments/${id}/arrive`),
};

// ── Slots ─────────────────────────────────────────────────────────────────────
export const slotService = {
  getSlots: (
    doctorId: string,
    date: string
  ): Promise<AxiosResponse<IApiResponse<ISlotPageData>>> =>
    api.get('/slots', { params: { doctorId, date } }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const userService = {
  getAll: (
    params?: Record<string, unknown>
  ): Promise<AxiosResponse<IApiResponse<IUser[]>>> =>
    api.get('/users', { params }),

  createReceptionist: (
    data: Pick<IUser, 'name' | 'email'> & { password: string }
  ): Promise<AxiosResponse<IApiResponse<IUser>>> =>
    api.post('/users/receptionist', data),

  toggleActive: (id: string): Promise<AxiosResponse<IApiResponse<{ isActive: boolean }>>> =>
    api.patch(`/users/${id}/toggle-active`),
};
