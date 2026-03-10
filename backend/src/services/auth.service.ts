import type { Request } from 'express';
import { userRepository } from '../repositories';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
} from '../utils/jwt.utils';
import { createAuditLog, getClientInfo } from '../utils/audit.utils';
import { AppError } from '../utils/AppError';
import type { IUserDocument } from '../models/User.model';

interface LoginResult {
  user: IUserDocument;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  user: IUserDocument;
}

export class AuthService {
  async login(email: string, password: string, req: Request): Promise<LoginResult> {
    const user = await userRepository.findByEmail(email, true);

    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account has been deactivated', 403);

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new AppError('Invalid email or password', 401);

    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Persist refresh token + last login (using repository methods)
    await userRepository.setRefreshToken(user._id as string, refreshToken);
    await userRepository.setLastLogin(user._id as string);

    createAuditLog({
      userId: user._id as string,
      userRole: user.role,
      action: 'LOGIN',
      details: { email: user.email },
      ...getClientInfo(req),
    });

    return { user, accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string | undefined): Promise<RefreshResult> {
    if (!refreshToken) throw new AppError('Refresh token not found', 401);

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await userRepository.findByIdWithSecrets(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Refresh token reuse detected or session expired', 401);
    }
    if (!user.isActive) throw new AppError('Account has been deactivated', 403);

    const payload = buildTokenPayload(user);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Rotate refresh token
    await userRepository.setRefreshToken(user._id as string, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
  }

  async logout(userId: string, req: Request): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) return;

    await userRepository.setRefreshToken(user._id as string, null);

    createAuditLog({
      userId: user._id as string,
      userRole: user.role,
      action: 'LOGOUT',
      ...getClientInfo(req),
    });
  }
}

export const authService = new AuthService();
