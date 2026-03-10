import type { Request } from "express";
import { doctorRepository, userRepository } from "../repositories";
import { createAuditLog, getClientInfo } from "../utils/audit.utils";
import { AppError } from "../utils/AppError";
import type { CreateDoctorInput } from "../validation/schemas";
import type { IDoctorDocument } from "../models/Doctor.model";
import type { IUserDocument } from "../models/User.model";

interface CreateDoctorResult {
  doctor: IDoctorDocument;
  userEmail: string;
}

export class DoctorService {
  async create(
    dto: CreateDoctorInput,
    req: Request,
  ): Promise<CreateDoctorResult> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing)
      throw new AppError("A user account with this email already exists", 409);

    let user: IUserDocument;
    try {
      user = await userRepository.create({
        name: dto.name,
        email: dto.email,
        password: dto.password,
        role: "doctor",
      });
    } catch (err) {
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000) {
        throw new AppError(
          "A user account with this email already exists",
          409,
        );
      }
      throw err;
    }

    let doctor: IDoctorDocument;
    try {
      doctor = await doctorRepository.create({
        name: dto.name,
        department: dto.department,
        specialization: dto.specialization,
        slotDuration: dto.slotDuration,
        workingHours: dto.workingHours,
        breaks: dto.breaks,
        workingDays: dto.workingDays,
        userId: user._id as IDoctorDocument["userId"],
      });
    } catch (err) {
      await userRepository.deleteById(user._id).catch(() => {
        console.error(
          "[DoctorService] Failed to clean up orphaned user after Doctor creation error",
        );
      });
      throw err;
    }

    await userRepository.updateById(user._id, {
      doctorId: doctor._id as IUserDocument["doctorId"],
    });
    await doctorRepository.linkUser(doctor._id, user._id);

    createAuditLog({
      userId: req.user!.userId,
      userRole: req.user!.role,
      action: "CREATE_DOCTOR",
      entity: "Doctor",
      entityId: doctor._id,
      details: { name: dto.name, department: dto.department, email: dto.email },
      ...getClientInfo(req),
    });

    return { doctor, userEmail: user.email };
  }
}

export const doctorService = new DoctorService();
