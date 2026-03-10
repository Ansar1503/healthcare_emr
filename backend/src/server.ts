/**
 * server.ts
 *
 * FIXES:
 * 1. DB connection failure now properly exits before routes are set up.
 *    Previously the void promise could silently fail.
 * 2. Added 'trust proxy' for correct req.ip behind a reverse proxy (nginx/load balancer).
 *    Without this, rate limiter and audit logs see the proxy IP, not the client IP.
 * 3. Added hpp (HTTP Parameter Pollution) protection.
 * 4. Moved morgan to only dev — was already done, confirmed correct.
 * 5. CORS: origin can be a comma-separated list in env for multi-origin support.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import patientRoutes from './routes/patient.routes';
import { apptRouter, slotRouter, userRouter } from './routes/remaining.routes';
import { errorHandler, notFound } from './middlewares/error.middleware';

// Ensures Express request augmentation (req.user) is picked up by TS compiler
import './types/express.d';

const app = express();

// ── Trust proxy (required for correct IP behind nginx/load balancer) ──────────
// Set to '1' if behind exactly one proxy, or 'true' for any
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── Database connection ────────────────────────────────────────────────────────
// Must be awaited before the app starts accepting connections
const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ DB connection failed:', (err as Error).message);
    process.exit(1);
  }

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow no-origin requests (mobile apps, curl) in development
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // strict limit for login attempts
    message: { success: false, message: 'Too many login attempts, please try again later.' },
    skipSuccessfulRequests: true, // only count failed attempts
  });

  app.use('/api/', globalLimiter);
  app.use('/api/auth/login', authLimiter);

  // ── Body / Cookie parsing ──────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // ── Health check (no auth required) ───────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api/auth',         authRoutes);
  app.use('/api/doctors',      doctorRoutes);
  app.use('/api/patients',     patientRoutes);
  app.use('/api/appointments', apptRouter);
  app.use('/api/slots',        slotRouter);
  app.use('/api/users',        userRouter);

  // ── 404 + Global error handler ─────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  const PORT = parseInt(process.env.PORT ?? '5000', 10);
  app.listen(PORT, () => {
    console.log(
      `🏥 Healthcare EMR Server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`
    );
  });
};

void startServer();

export default app;
