import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { UserRole, AuditAction } from '../types';

export interface IAuditLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  userRole: UserRole;
  action: AuditAction;
  entity?: string;
  entityId?: mongoose.Types.ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IAuditLogModel = Model<IAuditLogDocument>;

const AUDIT_ACTIONS: AuditAction[] = [
  'LOGIN', 'LOGOUT',
  'CREATE_DOCTOR', 'UPDATE_DOCTOR', 'DELETE_DOCTOR',
  'CREATE_RECEPTIONIST', 'UPDATE_RECEPTIONIST', 'DELETE_RECEPTIONIST',
  'CREATE_PATIENT', 'UPDATE_PATIENT', 'DELETE_PATIENT',
  'CREATE_APPOINTMENT', 'UPDATE_APPOINTMENT', 'DELETE_APPOINTMENT',
  'MARK_ARRIVED', 'MARK_COMPLETED', 'VIEW_APPOINTMENTS', 'GENERATE_SLOTS',
];

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, enum: ['super_admin', 'doctor', 'receptionist'] as UserRole[], required: true },
    action:   { type: String, enum: AUDIT_ACTIONS, required: true },
    entity:   { type: String },
    entityId: { type: Schema.Types.ObjectId },
    details:  { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument, IAuditLogModel>(
  'AuditLog',
  auditLogSchema
);
