import type { Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PatientModel, type IPatientDocument } from '../models/Patient.model';
import type { IPaginatedResult, IPaginationOptions } from '../types';

export interface IPatientRepository {
  search(
    query: string,
    pagination: IPaginationOptions
  ): Promise<IPaginatedResult<IPatientDocument>>;
  findByMobile(mobile: string): Promise<IPatientDocument | null>;
  findByCreator(userId: string | Types.ObjectId): Promise<IPatientDocument[]>;
}

export class PatientRepository
  extends BaseRepository<IPatientDocument>
  implements IPatientRepository
{
  constructor() {
    super(PatientModel);
  }

  /** Full-text + regex search across name and mobile fields. */
  async search(
    query: string,
    pagination: IPaginationOptions
  ): Promise<IPaginatedResult<IPatientDocument>> {
    const searchRegex = new RegExp(query.trim(), 'i');
    const filter = {
      $or: [{ name: searchRegex }, { mobile: searchRegex }],
    };
    return this.findPaginated(filter, pagination, { name: 1 });
  }

  async findByMobile(mobile: string): Promise<IPatientDocument | null> {
    return this.model.findOne({ mobile }).exec();
  }

  async findByCreator(userId: string | Types.ObjectId): Promise<IPatientDocument[]> {
    return this.model.find({ createdBy: userId }).sort({ createdAt: -1 }).exec();
  }
}

export const patientRepository = new PatientRepository();
