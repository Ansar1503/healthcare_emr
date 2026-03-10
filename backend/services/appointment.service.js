const Appointment = require('../models/Appointment.model');
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const { validateSlot } = require('../utils/slot.utils');
const { createAuditLog, getClientInfo } = require('../utils/audit.utils');

class AppointmentService {
  /**
   * Get appointments with filters and pagination
   */
  async getAppointments({ doctorId, date, status, patientId, page = 1, limit = 20, userId, userRole }) {
    const query = {};

    // Doctors can only see their own appointments
    if (userRole === 'doctor') {
      const user = await require('../models/User.model').findById(userId).lean();
      if (!user?.doctorId) throw Object.assign(new Error('Doctor profile not linked'), { statusCode: 400 });
      query.doctor = user.doctorId;
    } else if (doctorId) {
      query.doctor = doctorId;
    }

    if (date) query.date = date;
    if (status) query.status = status;
    if (patientId) query.patient = patientId;

    const skip = (Number(page) - 1) * Number(limit);

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('doctor', 'name department')
        .populate('patient', 'name mobile age gender')
        .populate('createdBy', 'name role')
        .sort({ date: 1, slotStart: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Appointment.countDocuments(query),
    ]);

    return {
      appointments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Create appointment with concurrency-safe slot validation
   */
  async createAppointment({ doctorId, patientId, date, slotStart, purpose, notes }, createdBy, req) {
    // 1. Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

    // 2. Check working day
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    if (!doctor.workingDays.includes(dayOfWeek)) {
      throw Object.assign(new Error('Doctor does not work on this day'), { statusCode: 400 });
    }

    // 3. Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) throw Object.assign(new Error('Patient not found'), { statusCode: 404 });

    // 4. Calculate slotEnd
    const [hours, minutes] = slotStart.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + doctor.slotDuration;
    const slotEnd = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // 5. Validate slot against doctor schedule
    const slotValidation = validateSlot(slotStart, slotEnd, doctor);
    if (!slotValidation.valid) {
      throw Object.assign(new Error(slotValidation.reason), { statusCode: 400 });
    }

    // 6. Check past date
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw Object.assign(new Error('Cannot book appointments in the past'), { statusCode: 400 });
    }

    // 7. Create appointment
    // MongoDB unique index on (doctor, date, slotStart) prevents race conditions
    // If two requests arrive simultaneously, only one will succeed; the other gets 11000 error
    const appointment = await Appointment.create({
      doctor: doctorId,
      patient: patientId,
      date,
      slotStart,
      slotEnd,
      purpose,
      notes,
      status: 'booked',
      createdBy,
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('doctor', 'name department')
      .populate('patient', 'name mobile age gender')
      .lean();

    await createAuditLog({
      userId: createdBy,
      userRole: req.user.role,
      action: 'CREATE_APPOINTMENT',
      entity: 'Appointment',
      entityId: appointment._id,
      details: { doctorId, patientId, date, slotStart },
      ...getClientInfo(req),
    });

    return populated;
  }

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId, updateData, updatedBy, req) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

    if (appointment.status === 'cancelled') {
      throw Object.assign(new Error('Cannot update a cancelled appointment'), { statusCode: 400 });
    }

    // Allowed fields to update
    const allowedUpdates = ['purpose', 'notes', 'status'];
    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        appointment[field] = updateData[field];
      }
    });

    appointment.updatedBy = updatedBy;
    await appointment.save();

    await createAuditLog({
      userId: updatedBy,
      userRole: req.user.role,
      action: 'UPDATE_APPOINTMENT',
      entity: 'Appointment',
      entityId: appointmentId,
      details: updateData,
      ...getClientInfo(req),
    });

    return appointment.populate(['doctor', 'patient']);
  }

  /**
   * Delete (cancel) appointment
   */
  async deleteAppointment(appointmentId, deletedBy, req) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

    if (['completed', 'cancelled'].includes(appointment.status)) {
      throw Object.assign(new Error(`Cannot delete a ${appointment.status} appointment`), { statusCode: 400 });
    }

    appointment.status = 'cancelled';
    appointment.updatedBy = deletedBy;
    await appointment.save();

    await createAuditLog({
      userId: deletedBy,
      userRole: req.user.role,
      action: 'DELETE_APPOINTMENT',
      entity: 'Appointment',
      entityId: appointmentId,
      ...getClientInfo(req),
    });

    return { message: 'Appointment cancelled successfully' };
  }

  /**
   * Mark patient as arrived
   */
  async markArrived(appointmentId, updatedBy, req) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });

    if (appointment.status !== 'booked') {
      throw Object.assign(
        new Error(`Cannot mark as arrived. Current status: ${appointment.status}`),
        { statusCode: 400 }
      );
    }

    appointment.status = 'arrived';
    appointment.arrivedAt = new Date();
    appointment.updatedBy = updatedBy;
    await appointment.save();

    await createAuditLog({
      userId: updatedBy,
      userRole: req.user.role,
      action: 'MARK_ARRIVED',
      entity: 'Appointment',
      entityId: appointmentId,
      ...getClientInfo(req),
    });

    return appointment;
  }
}

module.exports = new AppointmentService();
