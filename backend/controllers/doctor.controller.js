const Doctor = require('../models/Doctor.model');
const User = require('../models/User.model');
const { createAuditLog, getClientInfo } = require('../utils/audit.utils');

/**
 * GET /api/doctors
 */
const getDoctors = async (req, res, next) => {
  try {
    const { department, isActive = true } = req.query;
    const query = { isActive };
    if (department) query.department = department;

    const doctors = await Doctor.find(query)
      .select('-breaks -__v')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/doctors/:id
 */
const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/doctors
 * Super Admin creates a doctor + linked user account
 */
const createDoctor = async (req, res, next) => {
  try {
    const {
      name, department, specialization, slotDuration,
      workingHours, breaks, workingDays,
      // User account fields
      email, password,
    } = req.body;

    if (!name || !department || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, department, email, and password are required',
      });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    // Create doctor profile first
    const doctor = await Doctor.create({
      name, department, specialization,
      slotDuration: slotDuration || 15,
      workingHours: workingHours || { startTime: '09:00', endTime: '17:00' },
      breaks: breaks || [],
      workingDays: workingDays || [1, 2, 3, 4, 5],
    });

    // Create linked user account
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'doctor',
      doctorId: doctor._id,
    });

    // Link user back to doctor
    doctor.userId = user._id;
    await doctor.save();

    await createAuditLog({
      userId: req.user.userId,
      userRole: req.user.role,
      action: 'CREATE_DOCTOR',
      entity: 'Doctor',
      entityId: doctor._id,
      details: { name, department, email },
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: { doctor, user: { id: user._id, email: user.email } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/doctors/:id
 */
const updateDoctor = async (req, res, next) => {
  try {
    const allowedUpdates = [
      'name', 'department', 'specialization', 'slotDuration',
      'workingHours', 'breaks', 'workingDays', 'isActive'
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    await createAuditLog({
      userId: req.user.userId,
      userRole: req.user.role,
      action: 'UPDATE_DOCTOR',
      entity: 'Doctor',
      entityId: doctor._id,
      ...getClientInfo(req),
    });

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDoctors, getDoctorById, createDoctor, updateDoctor };
