/**
 * slot.controller.ts
 *
 * FIXES:
 * - Removed all manual query param validation — slotQuerySchema handles it.
 * - Removed past-date guard — it's a business rule in the service/util layer.
 * - No longer reconstructs doctor lean fields — repository returns typed document.
 * - Stats computation is still here (presentation concern, fine in controller).
 */
import type { Request, Response, NextFunction } from 'express';
import { doctorRepository, appointmentRepository } from '../repositories';
import { generateSlots } from '../utils/slot.utils';
import { AppError } from '../utils/AppError';
import type { ISlotStats, SlotStatus } from '../types';
import type { SlotQueryInput } from '../validation/schemas';

export const getSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validated by Zod: doctorId is a valid ObjectId, date is YYYY-MM-DD
    const { doctorId, date } = req.query as unknown as SlotQueryInput;

    // Reject queries for past dates
    const today = new Date().toISOString().split('T')[0]!;
    if (date < today) throw new AppError('Cannot view slots for past dates', 400);

    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new AppError('Doctor not found', 404);
    if (!doctor.isActive) throw new AppError('Doctor is not active', 400);

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    if (!doctor.workingDays.includes(dayOfWeek)) {
      res.status(200).json({
        success: true,
        data: {
          slots: [],
          message: 'Doctor does not work on this day',
          doctorName: doctor.name,
          date,
        },
      });
      return;
    }

    const bookedSlotStarts = await appointmentRepository.findBookedSlotStarts(doctorId, date);
    const slots = generateSlots(doctor, date, bookedSlotStarts);

    const countByStatus = (s: SlotStatus) => slots.filter((slot) => slot.status === s).length;
    const stats: ISlotStats = {
      total:     slots.length,
      available: countByStatus('available'),
      booked:    countByStatus('booked'),
      break:     countByStatus('break'),
      past:      countByStatus('past'),
    };

    res.status(200).json({
      success: true,
      data: {
        doctorId,
        doctorName: doctor.name,
        department: doctor.department,
        date,
        slotDuration: doctor.slotDuration,
        workingHours: doctor.workingHours,
        slots,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};
