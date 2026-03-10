import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { Gender, BloodGroup } from '../types';

export interface IPatientDocument extends Document {
  name: string;
  mobile: string;
  age: number;
  gender: Gender;
  bloodGroup: BloodGroup;
  address?: string;
  medicalHistory?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IPatientModel = Model<IPatientDocument>;

const patientSchema = new Schema<IPatientDocument>(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      match: [/^[0-9]{10,15}$/, 'Please provide a valid mobile number'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age cannot exceed 150'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['male', 'female', 'other'] as Gender[],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', ''] as BloodGroup[],
      default: '' as BloodGroup,
    },
    address:       { type: String, trim: true, maxlength: [300, 'Address cannot exceed 300 characters'] },
    medicalHistory: { type: String, trim: true, maxlength: [1000, 'Medical history cannot exceed 1000 characters'] },
    createdBy:      { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

patientSchema.index({ name: 'text', mobile: 'text' });
patientSchema.index({ mobile: 1 });
patientSchema.index({ createdAt: -1 });

export const PatientModel = mongoose.model<IPatientDocument, IPatientModel>('Patient', patientSchema);
