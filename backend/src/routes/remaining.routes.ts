// ─────────────────────────────────────────────────────────────────────────────
// Appointment routes
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import {
  getAppointments, createAppointment, updateAppointment,
  deleteAppointment, markArrived,
} from '../controllers/appointment.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../validation/validate';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentQuerySchema,
} from '../validation/schemas';

const apptRouter = Router();
apptRouter.use(authenticate);

// Query params validated via Zod (coerces page/limit to numbers)
apptRouter.get('/', validateQuery(appointmentQuerySchema), getAppointments);
apptRouter.post('/', requireRole(['super_admin', 'receptionist']), validateBody(createAppointmentSchema), createAppointment);
apptRouter.put('/:id', requireRole(['super_admin', 'receptionist']), validateBody(updateAppointmentSchema), updateAppointment);
apptRouter.delete('/:id', requireRole(['super_admin', 'receptionist']), deleteAppointment);
apptRouter.post('/:id/arrive', requireRole(['super_admin', 'receptionist']), markArrived);

export { apptRouter };

// ─────────────────────────────────────────────────────────────────────────────
// Slot routes
// ─────────────────────────────────────────────────────────────────────────────
import { Router as SlotRouter } from 'express';
import { getSlots } from '../controllers/slot.controller';
import { authenticate as auth, requireRole as role } from '../middlewares/auth.middleware';
import { validateQuery as vq } from '../validation/validate';
import { slotQuerySchema } from '../validation/schemas';

const slotRouter = SlotRouter();
slotRouter.use(auth);
slotRouter.get('/', role(['super_admin', 'receptionist']), vq(slotQuerySchema), getSlots);

export { slotRouter };

// ─────────────────────────────────────────────────────────────────────────────
// User / admin routes
// ─────────────────────────────────────────────────────────────────────────────
import { Router as UserRouter } from 'express';
import { getUsers, createReceptionist, toggleUserActive } from '../controllers/user.controller';
import { authenticate as authMw, requireRole as roleMw } from '../middlewares/auth.middleware';
import { validateBody as vb } from '../validation/validate';
import { createReceptionistSchema } from '../validation/schemas';

const userRouter = UserRouter();
userRouter.use(authMw);
userRouter.use(roleMw(['super_admin']));

userRouter.get('/', getUsers);
userRouter.post('/receptionist', vb(createReceptionistSchema), createReceptionist);
userRouter.patch('/:id/toggle-active', toggleUserActive);

export { userRouter };
