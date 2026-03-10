import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../models/User.model";
import { DoctorModel } from "../models/Doctor.model";

const seed = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const existing = await UserModel.findOne({ role: "super_admin" });
  if (!existing) {
    await UserModel.create({
      name: "Super Admin",
      email: "admin@hospital.com",
      password: "Admin@123456",
      role: "super_admin",
    });
    console.log("✅ Super Admin: admin@hospital.com / Admin@123456");
  } else {
    console.log("ℹ️  Super Admin already exists");
  }
  const doctor = await DoctorModel.create({
    name: "Dr. Sarah Johnson",
    department: "General Medicine",
    specialization: "Internal Medicine",
    slotDuration: 15,
    workingHours: { startTime: "09:00", endTime: "17:00" },
    breaks: [{ startTime: "13:00", endTime: "14:00" }],
    workingDays: [1, 2, 3, 4, 5],
  });

  const doctorUser = await UserModel.create({
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@hospital.com",
    password: "Doctor@123456",
    role: "doctor",
    doctorId: doctor._id,
  });

  doctor.userId = doctorUser._id as typeof doctor.userId;
  await doctor.save();
  console.log("✅ Doctor: sarah.johnson@hospital.com / Doctor@123456");
  await UserModel.create({
    name: "Jane Smith",
    email: "jane.smith@hospital.com",
    password: "Recept@123456",
    role: "receptionist",
  });
  console.log("✅ Receptionist: jane.smith@hospital.com / Recept@123456");

  console.log("\n🎉 Seed complete!");
  process.exit(0);
};

seed().catch((err: Error) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
