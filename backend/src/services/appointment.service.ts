import type { Request } from "express";
import {
  appointmentRepository,
  doctorRepository,
  patientRepository,
} from "../repositories";
import {
  validateSlot,
  minutesToTime,
  timeToMinutes,
} from "../utils/slot.utils";
import { createAuditLog, getClientInfo } from "../utils/audit.utils";
import { AppError } from "../utils/AppError";
import type {
  ICreateAppointmentDTO,
  IUpdateAppointmentDTO,
  IAppointmentFilters,
  IAppointmentPopulated,
  IPaginatedResult,
  IPaginationOptions,
  AppointmentStatus,
} from "../types";
import type { IAppointmentDocument } from "../models/Appointment.model";

const ALLOWED_STATUS_TRANSITIONS: Partial<
  Record<AppointmentStatus, AppointmentStatus[]>
> = {
  booked: ["arrived", "cancelled", "no_show"],
  arrived: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

const getTodayLocal = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export class AppointmentService {
  async getAppointments(
    filters: IAppointmentFilters,
    pagination: IPaginationOptions,
    requesterId: string,
    requesterRole: string,
    requesterDoctorId: string | null,
  ): Promise<IPaginatedResult<IAppointmentPopulated>> {
    const resolvedFilters: IAppointmentFilters = { ...filters };

    if (requesterRole === "doctor") {
      if (!requesterDoctorId) {
        throw new AppError("Doctor profile not linked to this user", 400);
      }
      resolvedFilters.doctorId = requesterDoctorId;
    }

    return appointmentRepository.findWithFiltersPopulated(
      resolvedFilters,
      pagination,
    );
  }

  async createAppointment(
    dto: ICreateAppointmentDTO,
    createdById: string,
    req: Request,
  ): Promise<IAppointmentPopulated> {
    const doctor = await doctorRepository.findById(dto.doctorId);
    if (!doctor) throw new AppError("Doctor not found", 404);

    const dayOfWeek = new Date(`${dto.date}T00:00:00`).getDay();
    if (!doctor.workingDays.includes(dayOfWeek)) {
      throw new AppError("Doctor does not work on this day", 400);
    }

    const patient = await patientRepository.findById(dto.patientId);
    if (!patient) throw new AppError("Patient not found", 404);

    const startMinutes = timeToMinutes(dto.slotStart);
    const slotEnd = minutesToTime(startMinutes + doctor.slotDuration);

    const slotValidation = validateSlot(dto.slotStart, slotEnd, doctor);
    if (!slotValidation.valid) {
      throw new AppError(slotValidation.reason ?? "Invalid slot", 400);
    }

    const today = getTodayLocal();
    if (dto.date < today) {
      throw new AppError("Cannot book appointments in the past", 400);
    }

    const appointment = await appointmentRepository.createAppointment({
      doctor: doctor._id,
      patient: patient._id,
      date: dto.date,
      slotStart: dto.slotStart,
      slotEnd,
      purpose: dto.purpose,
      notes: dto.notes,
      status: "booked",
      createdBy: createdById as unknown as IAppointmentDocument["createdBy"],
    });

    const populated = await appointmentRepository.findByIdPopulated(
      appointment._id,
    );
    if (!populated)
      throw new AppError("Failed to retrieve created appointment", 500);

    createAuditLog({
      userId: createdById,
      userRole: req.user!.role,
      action: "CREATE_APPOINTMENT",
      entity: "Appointment",
      entityId: appointment._id,
      details: {
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        date: dto.date,
        slotStart: dto.slotStart,
      },
      ...getClientInfo(req),
    });

    return populated;
  }

  async updateAppointment(
    appointmentId: string,
    dto: IUpdateAppointmentDTO,
    updatedById: string,
    req: Request,
  ): Promise<IAppointmentPopulated> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new AppError("Appointment not found", 404);

    if (appointment.status === "cancelled") {
      throw new AppError("Cannot update a cancelled appointment", 400);
    }

    if (dto.status && dto.status !== appointment.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[appointment.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new AppError(
          `Cannot transition from '${appointment.status}' to '${dto.status}'`,
          400,
        );
      }
    }

    if (dto.purpose !== undefined) appointment.purpose = dto.purpose;
    if (dto.notes !== undefined) appointment.notes = dto.notes;
    if (dto.status !== undefined) appointment.status = dto.status;
    appointment.updatedBy =
      updatedById as unknown as IAppointmentDocument["updatedBy"];

    await appointment.save();

    createAuditLog({
      userId: updatedById,
      userRole: req.user!.role,
      action: "UPDATE_APPOINTMENT",
      entity: "Appointment",
      entityId: appointmentId,
      details: dto as Record<string, unknown>,
      ...getClientInfo(req),
    });

    const populated =
      await appointmentRepository.findByIdPopulated(appointmentId);
    if (!populated)
      throw new AppError("Appointment not found after update", 500);
    return populated;
  }

  async cancelAppointment(
    appointmentId: string,
    cancelledById: string,
    req: Request,
  ): Promise<{ message: string }> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new AppError("Appointment not found", 404);

    if (["completed", "cancelled"].includes(appointment.status)) {
      throw new AppError(
        `Cannot cancel a ${appointment.status} appointment`,
        400,
      );
    }

    await appointmentRepository.setStatus(
      appointmentId,
      "cancelled",
      cancelledById,
    );

    createAuditLog({
      userId: cancelledById,
      userRole: req.user!.role,
      action: "DELETE_APPOINTMENT",
      entity: "Appointment",
      entityId: appointmentId,
      ...getClientInfo(req),
    });

    return { message: "Appointment cancelled successfully" };
  }

  async markArrived(
    appointmentId: string,
    updatedById: string,
    req: Request,
  ): Promise<IAppointmentDocument> {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new AppError("Appointment not found", 404);

    if (appointment.status !== "booked") {
      throw new AppError(
        `Cannot mark as arrived. Current status: ${appointment.status}`,
        400,
      );
    }

    const updated = await appointmentRepository.setStatus(
      appointmentId,
      "arrived",
      updatedById,
      { arrivedAt: new Date() } as Partial<IAppointmentDocument>,
    );
    if (!updated) throw new AppError("Appointment not found", 404);

    createAuditLog({
      userId: updatedById,
      userRole: req.user!.role,
      action: "MARK_ARRIVED",
      entity: "Appointment",
      entityId: appointmentId,
      ...getClientInfo(req),
    });

    return updated;
  }
}

export const appointmentService = new AppointmentService();
