const appointmentService = require('../services/appointment.service');

/**
 * GET /api/appointments
 */
const getAppointments = async (req, res, next) => {
  try {
    const { doctorId, date, status, patientId, page, limit } = req.query;
    const result = await appointmentService.getAppointments({
      doctorId,
      date,
      status,
      patientId,
      page,
      limit,
      userId: req.user.userId,
      userRole: req.user.role,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/appointments
 */
const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, patientId, date, slotStart, purpose, notes } = req.body;

    if (!doctorId || !patientId || !date || !slotStart) {
      return res.status(400).json({
        success: false,
        message: 'doctorId, patientId, date, and slotStart are required',
      });
    }

    const appointment = await appointmentService.createAppointment(
      { doctorId, patientId, date, slotStart, purpose, notes },
      req.user.userId,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/appointments/:id
 */
const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment(
      req.params.id,
      req.body,
      req.user.userId,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/appointments/:id
 */
const deleteAppointment = async (req, res, next) => {
  try {
    const result = await appointmentService.deleteAppointment(
      req.params.id,
      req.user.userId,
      req
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/appointments/:id/arrive
 */
const markArrived = async (req, res, next) => {
  try {
    const appointment = await appointmentService.markArrived(
      req.params.id,
      req.user.userId,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Patient marked as arrived',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  markArrived,
};
