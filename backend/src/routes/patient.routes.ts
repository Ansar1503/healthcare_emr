import { Router } from 'express';
import { searchPatients, getPatientById, createPatient, updatePatient } from '../controllers/patient.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../validation/validate';
import { createPatientSchema, updatePatientSchema } from '../validation/schemas';

const router = Router();
router.use(authenticate);
router.use(requireRole(['super_admin', 'receptionist']));

router.get('/search', searchPatients);
router.get('/:id', getPatientById);
router.post('/', validateBody(createPatientSchema), createPatient);
router.put('/:id', validateBody(updatePatientSchema), updatePatient);

export default router;
