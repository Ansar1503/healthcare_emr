const User = require('../models/User.model');
const { createAuditLog, getClientInfo } = require('../utils/audit.utils');

/**
 * GET /api/users
 * Super Admin: list all users (excluding super_admin)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;
    const query = { role: { $ne: 'super_admin' } };
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .populate('doctorId', 'name department')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/receptionist
 * Super Admin creates receptionist
 */
const createReceptionist = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and password are required',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'receptionist',
    });

    await createAuditLog({
      userId: req.user.userId,
      userRole: req.user.role,
      action: 'CREATE_RECEPTIONIST',
      entity: 'User',
      entityId: user._id,
      details: { name, email },
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      message: 'Receptionist created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/toggle-active
 */
const toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate super admin' });
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createReceptionist, toggleUserActive };
