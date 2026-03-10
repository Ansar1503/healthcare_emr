const Patient = require('../models/Patient.model');
const { createAuditLog, getClientInfo } = require('../utils/audit.utils');

/**
 * GET /api/patients/search?q=
 */
const searchPatients = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const searchRegex = new RegExp(q.trim(), 'i');

    const query = {
      $or: [{ name: searchRegex }, { mobile: searchRegex }],
    };

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .select('name mobile age gender bloodGroup')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Patient.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        patients,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients/:id
 */
const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/patients
 */
const createPatient = async (req, res, next) => {
  try {
    const { name, mobile, age, gender, bloodGroup, address, medicalHistory } = req.body;

    if (!name || !mobile || age === undefined || !gender) {
      return res.status(400).json({
        success: false,
        message: 'name, mobile, age, and gender are required',
      });
    }

    // Check for duplicate mobile
    const existing = await Patient.findOne({ mobile });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A patient with this mobile number already exists',
        data: existing,
      });
    }

    const patient = await Patient.create({
      name,
      mobile,
      age,
      gender,
      bloodGroup,
      address,
      medicalHistory,
      createdBy: req.user.userId,
    });

    await createAuditLog({
      userId: req.user.userId,
      userRole: req.user.role,
      action: 'CREATE_PATIENT',
      entity: 'Patient',
      entityId: patient._id,
      details: { name, mobile },
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/patients/:id
 */
const updatePatient = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'mobile', 'age', 'gender', 'bloodGroup', 'address', 'medicalHistory'];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const patient = await Patient.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchPatients, getPatientById, createPatient, updatePatient };
