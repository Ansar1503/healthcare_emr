const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userRole: {
      type: String,
      enum: ['super_admin', 'doctor', 'receptionist'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'CREATE_DOCTOR',
        'UPDATE_DOCTOR',
        'DELETE_DOCTOR',
        'CREATE_RECEPTIONIST',
        'UPDATE_RECEPTIONIST',
        'DELETE_RECEPTIONIST',
        'CREATE_PATIENT',
        'UPDATE_PATIENT',
        'DELETE_PATIENT',
        'CREATE_APPOINTMENT',
        'UPDATE_APPOINTMENT',
        'DELETE_APPOINTMENT',
        'MARK_ARRIVED',
        'MARK_COMPLETED',
        'VIEW_APPOINTMENTS',
        'GENERATE_SLOTS',
      ],
    },
    entity: {
      type: String, // e.g., "Appointment", "Patient", "Doctor"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Additional context
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for audit trail queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

// TTL index: auto-delete logs older than 1 year (optional)
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
