import type { FilterQuery, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { DoctorModel, type IDoctorDocument } from '../models/Doctor.model';
import type { Department } from '../types';

export interface IDoctorRepository {
  findActive(): Promise<IDoctorDocument[]>;
  findByDepartment(department: Department): Promise<IDoctorDocument[]>;
  findWithUser(id: string | Types.ObjectId): Promise<IDoctorDocument | null>;
  linkUser(
    doctorId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<IDoctorDocument | null>;
}

export class DoctorRepository
  extends BaseRepository<IDoctorDocument>
  implements IDoctorRepository
{
  constructor() {
    super(DoctorModel);
  }

  /** All active doctors, sorted by name. */
  async findActive(): Promise<IDoctorDocument[]> {
    return this.model.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findByDepartment(department: Department): Promise<IDoctorDocument[]> {
    return this.model
      .find({ department, isActive: true })
      .sort({ name: 1 })
      .exec();
  }

  /** Find doctor and populate linked user account. */
  async findWithUser(id: string | Types.ObjectId): Promise<IDoctorDocument | null> {
    return this.model.findById(id).populate('userId', 'name email isActive').exec();
  }

  /** Set the userId back-reference after creating the linked user account. */
  async linkUser(
    doctorId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<IDoctorDocument | null> {
    return this.updateById(doctorId, { userId });
  }

  /** Lean query list used by the slot controller (only schedule fields needed). */
  async findScheduleFields(
    filter: FilterQuery<IDoctorDocument>
  ): Promise<IDoctorDocument[]> {
    return this.model
      .find(filter)
      .select('name department workingHours breaks slotDuration workingDays isActive')
      .lean()
      .exec() as Promise<IDoctorDocument[]>;
  }
}

export const doctorRepository = new DoctorRepository();
