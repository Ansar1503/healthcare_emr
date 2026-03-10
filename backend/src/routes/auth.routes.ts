// auth.routes.ts
import { Router } from 'express';
import { login, refresh, logout, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../validation/validate';
import { loginSchema } from '../validation/schemas';

const router = Router();

// Zod validates email format + password presence before reaching the service
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
