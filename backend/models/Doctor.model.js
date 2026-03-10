const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // "HH:MM" format
  endTime: { type: String, required: true },
}, { _id: false });

const workingHoursSchema = new mongoose.Schema({
  startTime: { type: String, required: true, default: '09:00' },
  endTime: { type: String, required: true, default: '17:00' },
}, { _id: false });

const doctorSchema = new mongoose.Schema(
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
      enum: [
        'General Medicine',
        'Cardiology',
        'Orthopedics',
        'Pediatrics',
        'Gynecology',
        'Neurology',
        'Dermatology',
        'Ophthalmology',
        'ENT',
        'Psychiatry',
        'Radiology',
        'Oncology',
        'Urology',
        'Nephrology',
        'Gastroenterology',
      ],
    },
    specialization: {
      type: String,
      trim: true,
    },
    slotDuration: {
      type: Number,
      required: [true, 'Slot duration is required'],
      min: [5, 'Slot duration must be at least 5 minutes'],
      max: [60, 'Slot duration cannot exceed 60 minutes'],
      default: 15,
    },
    workingHours: {
      type: workingHoursSchema,
      default: () => ({ startTime: '09:00', endTime: '17:00' }),
    },
    breaks: {
      type: [breakSchema],
      default: [],
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);
doctorSchema.index({ department: 1 });
doctorSchema.index({ isActive: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
