const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
    },
    date: {
      type: String, // "YYYY-MM-DD" format for easy querying
      required: [true, 'Appointment date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    slotStart: {
      type: String, // "HH:MM" format
      required: [true, 'Slot start time is required'],
    },
    slotEnd: {
      type: String, // "HH:MM" format
      required: [true, 'Slot end time is required'],
    },
    status: {
      type: String,
      enum: ['booked', 'arrived', 'completed', 'cancelled', 'no_show'],
      default: 'booked',
    },
    purpose: {
      type: String,
      trim: true,
      maxlength: [200, 'Purpose cannot exceed 200 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    arrivedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// =============================================
// CRITICAL: Unique index prevents double booking
// This is the primary concurrency control mechanism
// =============================================
appointmentSchema.index(
  { doctor: 1, date: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $nin: ['cancelled'] } },
    name: 'unique_doctor_date_slot',
  }
);

// Performance indexes
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
