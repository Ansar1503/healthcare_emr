import type { FilterQuery, FlattenMaps, Types } from "mongoose";
import { BaseRepository } from "./base.repository";
import { DoctorModel, type IDoctorDocument } from "../models/Doctor.model";
import type { Department } from "../types";

export interface IDoctorRepository {
  findActive(): Promise<IDoctorDocument[]>;
  findByDepartment(department: Department): Promise<IDoctorDocument[]>;
  findWithUser(id: string | Types.ObjectId): Promise<IDoctorDocument | null>;
  linkUser(
    doctorId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<IDoctorDocument | null>;
}

export class DoctorRepository
  extends BaseRepository<IDoctorDocument>
  implements IDoctorRepository
{
  constructor() {
    super(DoctorModel);
  }

  async findActive(): Promise<IDoctorDocument[]> {
    return this.model.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findByDepartment(department: Department): Promise<IDoctorDocument[]> {
    return this.model
      .find({ department, isActive: true })
      .sort({ name: 1 })
      .exec();
  }

  async findWithUser(
    id: string | Types.ObjectId,
  ): Promise<IDoctorDocument | null> {
    return this.model
      .findById(id)
      .populate("userId", "name email isActive")
      .exec();
  }

  async linkUser(
    doctorId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<IDoctorDocument | null> {
    return this.updateById(doctorId, { userId });
  }

  async findScheduleFields(
    filter: FilterQuery<IDoctorDocument>,
  ): Promise<FlattenMaps<IDoctorDocument>[]> {
    return this.model
      .find(filter)
      .select(
        "name department workingHours breaks slotDuration workingDays isActive",
      )
      .lean()
      .exec();
  }
}

export const doctorRepository = new DoctorRepository();
