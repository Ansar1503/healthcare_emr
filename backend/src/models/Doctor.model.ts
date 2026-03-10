import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { Department, IBreakPeriod, IWorkingHours } from '../types';

export interface IDoctorDocument extends Document {
  name: string;
  department: Department;
  specialization?: string;
  slotDuration: number;
  workingHours: IWorkingHours;
  breaks: IBreakPeriod[];
  workingDays: number[];
  isActive: boolean;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IDoctorModel = Model<IDoctorDocument>;

// ── Subdocument schemas ───────────────────────────────────────────────────────
const breakSchema = new Schema<IBreakPeriod>(
  {
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
  },
  { _id: false }
);

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    startTime: { type: String, required: true, default: '09:00' },
    endTime:   { type: String, required: true, default: '17:00' },
  },
  { _id: false }
);

const DEPARTMENTS: Department[] = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Gynecology', 'Neurology', 'Dermatology', 'Ophthalmology', 'ENT',
  'Psychiatry', 'Radiology', 'Oncology', 'Urology', 'Nephrology',
  'Gastroenterology',
];

// ── Schema ────────────────────────────────────────────────────────────────────
const doctorSchema = new Schema<IDoctorDocument>(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      enum: DEPARTMENTS,
    },
    specialization: { type: String, trim: true },
    slotDuration: {
      type: Number,
      required: [true, 'Slot duration is required'],
      min: [5, 'Slot duration must be at least 5 minutes'],
      max: [60, 'Slot duration cannot exceed 60 minutes'],
      default: 15,
    },
    workingHours: {
      type: workingHoursSchema,
      default: (): IWorkingHours => ({ startTime: '09:00', endTime: '17:00' }),
    },
    breaks: { type: [breakSchema], default: [] },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    isActive:    { type: Boolean, default: true },
    userId:      { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

doctorSchema.index({ department: 1 });
doctorSchema.index({ isActive: 1 });

export const DoctorModel = mongoose.model<IDoctorDocument, IDoctorModel>('Doctor', doctorSchema);
