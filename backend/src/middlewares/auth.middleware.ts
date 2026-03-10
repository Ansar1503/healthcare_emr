import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../utils/jwt.utils';
import { UserModel } from '../models/User.model';
import type { UserRole } from '../types';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
      return;
    }

    const token = authHeader.slice(7);
    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided.' });
      return;
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      const isExpired = (err as Error).name === 'TokenExpiredError';
      res.status(401).json({
        success: false,
        message: isExpired ? 'Token expired.' : 'Invalid token.',
        ...(isExpired && { code: 'TOKEN_EXPIRED' }),
      });
      return;
    }

    if (!mongoose.isValidObjectId(decoded.userId)) {
      res.status(401).json({ success: false, message: 'Invalid token payload.' });
      return;
    }

    const user = await UserModel.findById(decoded.userId)
      .select('_id isActive')
      .lean()
      .exec();

    if (!user) {
      res.status(401).json({ success: false, message: 'User no longer exists.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account has been deactivated.' });
      return;
    }

    req.user = {
      userId:   decoded.userId,
      role:     decoded.role,
      name:     decoded.name,
      email:    decoded.email,
      doctorId: decoded.doctorId ?? null,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole =
  (allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
