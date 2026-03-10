const express = require('express');
const router = express.Router();
const { getDoctors, getDoctorById, createDoctor, updateDoctor } = require('../controllers/doctor.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// All doctor routes require authentication
router.use(authenticate);

// GET /api/doctors - accessible by all authenticated users
router.get('/', getDoctors);

// GET /api/doctors/:id
router.get('/:id', getDoctorById);

// POST /api/doctors - super admin only
router.post('/', requireRole(['super_admin']), createDoctor);

// PUT /api/doctors/:id - super admin only
router.put('/:id', requireRole(['super_admin']), updateDoctor);

module.exports = router;
