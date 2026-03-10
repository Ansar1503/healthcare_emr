import type { Request, Response, NextFunction } from "express";
import { userRepository } from "../repositories";
import { createAuditLog, getClientInfo } from "../utils/audit.utils";
import { AppError } from "../utils/AppError";
import type { UserRole } from "../types";
import type { CreateReceptionistInput } from "../validation/schemas";

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role } = req.query as { role?: UserRole };
    const filter = role
      ? { role }
      : { role: { $in: ["doctor", "receptionist"] as UserRole[] } };

    const users = await userRepository.find(filter);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const createReceptionist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password } = req.body as CreateReceptionistInput;

    const existing = await userRepository.findByEmail(email);
    if (existing) throw new AppError("Email already in use", 409);

    const user = await userRepository.create({
      name,
      email,
      password,
      role: "receptionist",
    });

    createAuditLog({
      userId: req.user!.userId,
      userRole: req.user!.role,
      action: "CREATE_RECEPTIONIST",
      entity: "User",
      entityId: user._id,
      details: { name, email },
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      message: "Receptionist created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userRepository.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);

    if (user.role === "super_admin") {
      throw new AppError("Cannot deactivate a super admin account", 403);
    }

    if (user._id.toString() === req.user!.userId) {
      throw new AppError("You cannot deactivate your own account", 400);
    }

    const updated = user.isActive
      ? await userRepository.deactivate(req.params.id)
      : await userRepository.activate(req.params.id);

    res.status(200).json({
      success: true,
      message: `User ${updated?.isActive ? "activated" : "deactivated"} successfully`,
      data: { isActive: updated?.isActive },
    });
  } catch (error) {
    next(error);
  }
};
