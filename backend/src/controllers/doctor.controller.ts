import type { Request, Response, NextFunction } from 'express';
import { doctorRepository } from '../repositories';
import { doctorService } from '../services/doctor.service';
import { createAuditLog, getClientInfo } from '../utils/audit.utils';
import { AppError } from '../utils/AppError';
import type { CreateDoctorInput, UpdateDoctorInput } from '../validation/schemas';

export const getDoctors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isActive = req.query.isActive !== 'false';
    const doctors = await doctorRepository.findScheduleFields({ isActive });
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
};

export const getDoctorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctor = await doctorRepository.findById(req.params.id);
    if (!doctor) throw new AppError('Doctor not found', 404);
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = req.body as CreateDoctorInput;
    const result = await doctorService.create(dto, req);

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updates = req.body as UpdateDoctorInput;

    const doctor = await doctorRepository.updateById(req.params.id, updates);
    if (!doctor) throw new AppError('Doctor not found', 404);

    createAuditLog({
      userId: req.user!.userId,
      userRole: req.user!.role,
      action: 'UPDATE_DOCTOR',
      entity: 'Doctor',
      entityId: req.params.id,
      details: updates as Record<string, unknown>,
      ...getClientInfo(req),
    });

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};
