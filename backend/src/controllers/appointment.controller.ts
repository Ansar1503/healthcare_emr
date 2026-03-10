import type { Request, Response, NextFunction } from "express";
import { appointmentService } from "../services/appointment.service";
import type {
  IAppointmentFilters,
  IPaginationOptions,
  AppointmentStatus,
} from "../types";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentQueryInput,
} from "../validation/schemas";

export const getAppointments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { doctorId, date, status, patientId, page, limit } =
      req.query as unknown as AppointmentQueryInput;

    const filters: IAppointmentFilters = {
      doctorId,
      date,
      status: status as AppointmentStatus | undefined,
      patientId,
    };
    const pagination: IPaginationOptions = { page, limit };

    const result = await appointmentService.getAppointments(
      filters,
      pagination,
      req.user!.userId,
      req.user!.role,
      req.user!.doctorId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = req.body as CreateAppointmentInput;
    const appointment = await appointmentService.createAppointment(
      dto,
      req.user!.userId,
      req,
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Appointment booked successfully",
        data: appointment,
      });
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = req.body as UpdateAppointmentInput;
    const appointment = await appointmentService.updateAppointment(
      req.params.id,
      dto,
      req.user!.userId,
      req,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Appointment updated successfully",
        data: appointment,
      });
  } catch (error) {
    next(error);
  }
};

export const deleteAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await appointmentService.cancelAppointment(
      req.params.id,
      req.user!.userId,
      req,
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const markArrived = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const appointment = await appointmentService.markArrived(
      req.params.id,
      req.user!.userId,
      req,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Patient marked as arrived",
        data: appointment,
      });
  } catch (error) {
    next(error);
  }
};
