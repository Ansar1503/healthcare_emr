const express = require('express');
const router = express.Router();
const {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  markArrived,
} = require('../controllers/appointment.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

router.use(authenticate);

// GET /api/appointments - all roles can view (filtered by role in service)
router.get('/', getAppointments);

// POST /api/appointments - receptionist and super_admin
router.post('/', requireRole(['super_admin', 'receptionist']), createAppointment);

// PUT /api/appointments/:id
router.put('/:id', requireRole(['super_admin', 'receptionist']), updateAppointment);

// DELETE /api/appointments/:id
router.delete('/:id', requireRole(['super_admin', 'receptionist']), deleteAppointment);

// POST /api/appointments/:id/arrive
router.post('/:id/arrive', requireRole(['super_admin', 'receptionist']), markArrived);

module.exports = router;
