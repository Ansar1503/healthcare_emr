import type { FilterQuery, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { AppointmentModel, type IAppointmentDocument } from '../models/Appointment.model';
import type {
  AppointmentStatus,
  IAppointmentFilters,
  IAppointmentPopulated,
  IPaginatedResult,
  IPaginationOptions,
} from '../types';

export interface IAppointmentRepository {
  findBySlot(
    doctorId: string | Types.ObjectId,
    date: string,
    slotStart: string
  ): Promise<IAppointmentDocument | null>;

  findBookedSlotStarts(
    doctorId: string | Types.ObjectId,
    date: string
  ): Promise<string[]>;

  findWithFiltersPopulated(
    filters: IAppointmentFilters,
    pagination: IPaginationOptions
  ): Promise<IPaginatedResult<IAppointmentPopulated>>;

  createAppointment(
    data: Partial<IAppointmentDocument>
  ): Promise<IAppointmentDocument>;

  findByIdPopulated(
    id: string | Types.ObjectId
  ): Promise<IAppointmentPopulated | null>;

  setStatus(
    id: string | Types.ObjectId,
    status: AppointmentStatus,
    updatedBy: string | Types.ObjectId,
    extras?: Partial<IAppointmentDocument>
  ): Promise<IAppointmentDocument | null>;
}

export class AppointmentRepository
  extends BaseRepository<IAppointmentDocument>
  implements IAppointmentRepository
{
  constructor() {
    super(AppointmentModel);
  }

  
  async findBySlot(
    doctorId: string | Types.ObjectId,
    date: string,
    slotStart: string
  ): Promise<IAppointmentDocument | null> {
    return this.model
      .findOne({
        doctor: doctorId,
        date,
        slotStart,
        status: { $nin: ['cancelled'] },
      })
      .exec();
  }

  
  async findBookedSlotStarts(
    doctorId: string | Types.ObjectId,
    date: string
  ): Promise<string[]> {
    const docs = await this.model
      .find({ doctor: doctorId, date, status: { $nin: ['cancelled'] } })
      .select('slotStart')
      .lean()
      .exec();
    return docs.map((d) => d.slotStart);
  }

  
  async findWithFiltersPopulated(
    filters: IAppointmentFilters,
    pagination: IPaginationOptions
  ): Promise<IPaginatedResult<IAppointmentPopulated>> {
    const query: FilterQuery<IAppointmentDocument> = {};

    if (filters.doctorId)  query.doctor  = filters.doctorId;
    if (filters.date)      query.date    = filters.date;
    if (filters.status)    query.status  = filters.status;
    if (filters.patientId) query.patient = filters.patientId;

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(query)
        .populate<{ doctor: IAppointmentPopulated['doctor'] }>('doctor', 'name department')
        .populate<{ patient: IAppointmentPopulated['patient'] }>('patient', 'name mobile age gender')
        .populate<{ createdBy: IAppointmentPopulated['createdBy'] }>('createdBy', 'name role')
        .sort({ date: 1, slotStart: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<IAppointmentPopulated[]>,
      this.model.countDocuments(query).exec(),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAppointment(
    data: Partial<IAppointmentDocument>
  ): Promise<IAppointmentDocument> {
    return this.model.create(data);
  }

  
  async findByIdPopulated(
    id: string | Types.ObjectId
  ): Promise<IAppointmentPopulated | null> {
    return this.model
      .findById(id)
      .populate<{ doctor: IAppointmentPopulated['doctor'] }>('doctor', 'name department')
      .populate<{ patient: IAppointmentPopulated['patient'] }>('patient', 'name mobile age gender')
      .lean()
      .exec() as Promise<IAppointmentPopulated | null>;
  }

  
  async setStatus(
    id: string | Types.ObjectId,
    status: AppointmentStatus,
    updatedBy: string | Types.ObjectId,
    extras: Partial<IAppointmentDocument> = {}
  ): Promise<IAppointmentDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { status, updatedBy, ...extras },
        { new: true }
      )
      .exec();
  }
}

export const appointmentRepository = new AppointmentRepository();
