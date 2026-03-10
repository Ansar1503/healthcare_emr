import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";
import doctorRoutes from "./routes/doctor.routes";
import patientRoutes from "./routes/patient.routes";
import { apptRouter, slotRouter, userRouter } from "./routes/remaining.routes";
import { errorHandler, notFound } from "./middlewares/error.middleware";

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error("❌ DB connection failed:", (err as Error).message);
    process.exit(1);
  }

  app.use(helmet());

  const allowedOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      message: "Too many login attempts, please try again later.",
    },
    skipSuccessfulRequests: true,
  });

  app.use("/api/", globalLimiter);
  app.use("/api/auth/login", authLimiter);

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser());

  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/doctors", doctorRoutes);
  app.use("/api/patients", patientRoutes);
  app.use("/api/appointments", apptRouter);
  app.use("/api/slots", slotRouter);
  app.use("/api/users", userRouter);

  app.use(notFound);
  app.use(errorHandler);

  const PORT = parseInt(process.env.PORT ?? "5000", 10);
  app.listen(PORT, () => {
    console.log(
      `🏥 Healthcare EMR Server running on port ${PORT} [${process.env.NODE_ENV ?? "development"}]`,
    );
  });
};

void startServer();

export default app;
