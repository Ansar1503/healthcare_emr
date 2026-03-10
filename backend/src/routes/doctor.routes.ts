import { Router } from 'express';
import { getDoctors, getDoctorById, createDoctor, updateDoctor } from '../controllers/doctor.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../validation/validate';
import { createDoctorSchema, updateDoctorSchema } from '../validation/schemas';

const router = Router();
router.use(authenticate);

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.post('/', requireRole(['super_admin']), validateBody(createDoctorSchema), createDoctor);
router.put('/:id', requireRole(['super_admin']), validateBody(updateDoctorSchema), updateDoctor);

export default router;
