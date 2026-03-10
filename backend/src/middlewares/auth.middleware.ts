/**
 * auth.middleware.ts
 *
 * FIXES:
 * 1. PERFORMANCE: The authenticate middleware previously fetched the full user document
 *    from MongoDB on every single authenticated request. This is a significant N+1
 *    overhead. Changed to .lean().select('_id isActive') — only what we need.
 * 2. BUG: If the token was expired, we returned early without calling next(error),
 *    so the response was sent but Express thought the middleware chain continued.
 *    Now uses explicit early returns consistently.
 * 3. SECURITY: Added explicit check that the decoded userId is a valid ObjectId
 *    format before querying MongoDB, preventing CastError leakage.
 */
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

    const token = authHeader.slice(7); // faster than split(' ')[1]
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

    // Guard against a tampered token with a non-ObjectId userId
    if (!mongoose.isValidObjectId(decoded.userId)) {
      res.status(401).json({ success: false, message: 'Invalid token payload.' });
      return;
    }

    // FIX: lean + minimal projection — only 2 fields needed, no full document overhead
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

    // Attach all needed data from the JWT payload — no extra DB read required
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

/** RBAC guard — must be called after authenticate(). */
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
