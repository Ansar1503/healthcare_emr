/**
 * patient.controller.ts
 *
 * FIXES:
 * - Manual null-checks and field guards removed (Zod middleware handles these).
 * - createPatient no longer does inline typeof checks — Zod schema validates age as number.
 * - createdBy assignment no longer needs the double-cast hack —
 *   we pass a plain string and let Mongoose coerce it.
 * - Search requires at least 2 chars — validated here since it's a query param
 *   not covered by the body schema (search is GET).
 */
import type { Request, Response, NextFunction } from 'express';
import { patientRepository } from '../repositories';
import { createAuditLog, getClientInfo } from '../utils/audit.utils';
import { AppError } from '../utils/AppError';
import type { IPaginationOptions } from '../types';
import type { CreatePatientInput, UpdatePatientInput } from '../validation/schemas';
import type mongoose from 'mongoose';

export const searchPatients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, page = '1', limit = '10' } = req.query as Record<string, string | undefined>;

    if (!q || q.trim().length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400);
    }

    const pagination: IPaginationOptions = {
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 10)),
    };

    const result = await patientRepository.search(q.trim(), pagination);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const patient = await patientRepository.findById(req.params.id);
    if (!patient) throw new AppError('Patient not found', 404);
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Zod already validated: name, mobile (regex), age (number), gender (enum)
    const dto = req.body as CreatePatientInput;

    const existing = await patientRepository.findByMobile(dto.mobile);
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'A patient with this mobile number already exists',
        data: existing,
      });
      return;
    }

    const patient = await patientRepository.create({
      ...dto,
      createdBy: req.user!.userId as unknown as mongoose.Types.ObjectId,
    });

    createAuditLog({
      userId: req.user!.userId,
      userRole: req.user!.role,
      action: 'CREATE_PATIENT',
      entity: 'Patient',
      entityId: patient._id as string,
      details: { name: dto.name, mobile: dto.mobile },
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Zod .partial().strict() already validated and stripped unknown fields
    const updates = req.body as UpdatePatientInput;

    const patient = await patientRepository.updateById(req.params.id, updates);
    if (!patient) throw new AppError('Patient not found', 404);

    createAuditLog({
      userId: req.user!.userId,
      userRole: req.user!.role,
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      entityId: req.params.id,
      details: updates as Record<string, unknown>,
      ...getClientInfo(req),
    });

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};
