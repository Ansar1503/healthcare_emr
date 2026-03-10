import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { AppointmentStatus } from '../types';

export interface IAppointmentDocument extends Document {
  doctor: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  date: string;      // "YYYY-MM-DD"
  slotStart: string; // "HH:MM"
  slotEnd: string;   // "HH:MM"
  status: AppointmentStatus;
  purpose?: string;
  notes?: string;
  arrivedAt?: Date;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IAppointmentModel = Model<IAppointmentDocument>;

const appointmentSchema = new Schema<IAppointmentDocument>(
  {
    doctor:   { type: Schema.Types.ObjectId, ref: 'Doctor',  required: [true, 'Doctor is required'] },
    patient:  { type: Schema.Types.ObjectId, ref: 'Patient', required: [true, 'Patient is required'] },
    date: {
      type: String,
      required: [true, 'Appointment date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    slotStart: { type: String, required: [true, 'Slot start time is required'] },
    slotEnd:   { type: String, required: [true, 'Slot end time is required'] },
    status: {
      type: String,
      enum: ['booked', 'arrived', 'completed', 'cancelled', 'no_show'] as AppointmentStatus[],
      default: 'booked' as AppointmentStatus,
    },
    purpose:     { type: String, trim: true, maxlength: [200, 'Purpose cannot exceed 200 characters'] },
    notes:       { type: String, trim: true, maxlength: [1000, 'Notes cannot exceed 1000 characters'] },
    arrivedAt:   { type: Date },
    completedAt: { type: Date },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ── CRITICAL: Unique partial index — primary concurrency control ──────────────
appointmentSchema.index(
  { doctor: 1, date: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $nin: ['cancelled'] } },
    name: 'unique_doctor_date_slot',
  }
);

// ── Performance indexes ───────────────────────────────────────────────────────
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ createdBy: 1 });

export const AppointmentModel = mongoose.model<IAppointmentDocument, IAppointmentModel>(
  'Appointment',
  appointmentSchema
);
