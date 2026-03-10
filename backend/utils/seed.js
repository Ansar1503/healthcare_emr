require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Doctor = require('../models/Doctor.model');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create Super Admin
    const existing = await User.findOne({ role: 'super_admin' });
    if (!existing) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@hospital.com',
        password: 'Admin@123456',
        role: 'super_admin',
      });
      console.log('✅ Super Admin created: admin@hospital.com / Admin@123456');
    } else {
      console.log('ℹ️  Super Admin already exists');
    }

    // Create sample doctor
    const sampleDoctor = await Doctor.create({
      name: 'Dr. Sarah Johnson',
      department: 'General Medicine',
      specialization: 'Internal Medicine',
      slotDuration: 15,
      workingHours: { startTime: '09:00', endTime: '17:00' },
      breaks: [{ startTime: '13:00', endTime: '14:00' }],
      workingDays: [1, 2, 3, 4, 5],
    });

    const doctorUser = await User.create({
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@hospital.com',
      password: 'Doctor@123456',
      role: 'doctor',
      doctorId: sampleDoctor._id,
    });

    sampleDoctor.userId = doctorUser._id;
    await sampleDoctor.save();
    console.log('✅ Sample Doctor created: sarah.johnson@hospital.com / Doctor@123456');

    // Create sample receptionist
    await User.create({
      name: 'Jane Smith',
      email: 'jane.smith@hospital.com',
      password: 'Recept@123456',
      role: 'receptionist',
    });
    console.log('✅ Receptionist created: jane.smith@hospital.com / Recept@123456');

    console.log('\n🎉 Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();
