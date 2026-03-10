// patient.routes.js
const express = require('express');
const patientRouter = express.Router();
const { searchPatients, getPatientById, createPatient, updatePatient } = require('../controllers/patient.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

patientRouter.use(authenticate);
patientRouter.use(requireRole(['super_admin', 'receptionist']));

patientRouter.get('/search', searchPatients);
patientRouter.get('/:id', getPatientById);
patientRouter.post('/', createPatient);
patientRouter.put('/:id', updatePatient);

module.exports = patientRouter;
