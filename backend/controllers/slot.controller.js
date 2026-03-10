const Doctor = require('../models/Doctor.model');
const Appointment = require('../models/Appointment.model');
const { generateSlots } = require('../utils/slot.utils');

/**
 * GET /api/slots?doctorId=&date=
 * 
 * Returns available/unavailable slots for a doctor on a given date
 */
const getSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: 'doctorId and date are required',
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format',
      });
    }

    // Validate date is not in the past (allow today)
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot view slots for past dates',
      });
    }

    // Fetch doctor details
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (!doctor.isActive) {
      return res.status(400).json({ success: false, message: 'Doctor is not active' });
    }

    // Check working day
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    if (!doctor.workingDays.includes(dayOfWeek)) {
      return res.status(200).json({
        success: true,
        data: {
          slots: [],
          message: 'Doctor does not work on this day',
          doctorName: doctor.name,
          date,
        },
      });
    }

    // Fetch booked slots for this doctor on this date
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      date,
      status: { $nin: ['cancelled'] },
    })
      .select('slotStart')
      .lean();

    const bookedSlotStarts = bookedAppointments.map((a) => a.slotStart);

    // Generate all slots
    const slots = generateSlots(doctor, date, bookedSlotStarts);

    const stats = {
      total: slots.length,
      available: slots.filter((s) => s.status === 'available').length,
      booked: slots.filter((s) => s.status === 'booked').length,
      break: slots.filter((s) => s.status === 'break').length,
      past: slots.filter((s) => s.status === 'past').length,
    };

    res.status(200).json({
      success: true,
      data: {
        doctorId,
        doctorName: doctor.name,
        department: doctor.department,
        date,
        slotDuration: doctor.slotDuration,
        workingHours: doctor.workingHours,
        slots,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSlots };
