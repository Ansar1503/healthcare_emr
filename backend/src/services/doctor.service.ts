/**
 * doctor.service.ts
 *
 * FIXES:
 * 1. BUG: The original code created the Doctor record FIRST, then created the User.
 *    If User creation failed (e.g. duplicate email detected after the initial check
 *    due to a race condition), the Doctor record would be orphaned in the DB.
 *    Fixed by creating User first, then Doctor, then linking them.
 *    If Doctor creation fails, the User record is cleaned up.
 * 2. SECURITY: Password strength is now validated at the Zod schema level
 *    (uppercase + number required), not just min-length.
 * 3. PERFORMANCE: email check is done at schema level AND here — the second check
 *    catches race conditions between the Zod validate and the DB insert.
 */
import type { Request } from 'express';
import { doctorRepository, userRepository } from '../repositories';
import { createAuditLog, getClientInfo } from '../utils/audit.utils';
import { AppError } from '../utils/AppError';
import type { CreateDoctorInput } from '../validation/schemas';
import type { IDoctorDocument } from '../models/Doctor.model';
import type { IUserDocument } from '../models/User.model';

interface CreateDoctorResult {
  doctor: IDoctorDocument;
  userEmail: string;
}

export class DoctorService {
  async create(dto: CreateDoctorInput, req: Request): Promise<CreateDoctorResult> {
    // Check email availability (also caught by unique index, but gives a cleaner message)
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new AppError('A user account with this email already exists', 409);

    // FIX: Create User FIRST so we can roll back if Doctor creation fails
    let user: IUserDocument;
    try {
      user = await userRepository.create({
        name:  dto.name,
        email: dto.email,
        password: dto.password,
        role: 'doctor',
      });
    } catch (err) {
      // Duplicate key on email (race condition) — surface a clean message
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000) {
        throw new AppError('A user account with this email already exists', 409);
      }
      throw err;
    }

    let doctor: IDoctorDocument;
    try {
      doctor = await doctorRepository.create({
        name:         dto.name,
        department:   dto.department,
        specialization: dto.specialization,
        slotDuration: dto.slotDuration,
        workingHours: dto.workingHours,
        breaks:       dto.breaks,
        workingDays:  dto.workingDays,
        userId:       user._id as IDoctorDocument['userId'],
      });
    } catch (err) {
      // Doctor creation failed — clean up the orphaned user
      await userRepository.deleteById(user._id as string).catch(() => {
        console.error('[DoctorService] Failed to clean up orphaned user after Doctor creation error');
      });
      throw err;
    }

    // Update the user to point back to the doctor profile
    await userRepository.updateById(user._id as string, {
      doctorId: doctor._id as IUserDocument['doctorId'],
    });

    // Update doctor to point back to the user
    await doctorRepository.linkUser(doctor._id as string, user._id as string);

    createAuditLog({
      userId: req.user!.userId,
      userRole: req.user!.role,
      action: 'CREATE_DOCTOR',
      entity: 'Doctor',
      entityId: doctor._id as string,
      details: { name: dto.name, department: dto.department, email: dto.email },
      ...getClientInfo(req),
    });

    return { doctor, userEmail: user.email };
  }
}

export const doctorService = new DoctorService();
