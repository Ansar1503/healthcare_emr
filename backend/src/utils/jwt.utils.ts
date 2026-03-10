import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { IUserDocument } from '../models/User.model';
import type { IJwtPayload } from '../types';

const getSecret = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Environment variable ${key} is not set`);
  return value;
};

export const generateAccessToken = (payload: IJwtPayload): string =>
  jwt.sign(payload, getSecret('JWT_ACCESS_SECRET'), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  });

export const generateRefreshToken = (payload: IJwtPayload): string =>
  jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string): IJwtPayload =>
  jwt.verify(token, getSecret('JWT_ACCESS_SECRET')) as IJwtPayload;

export const verifyRefreshToken = (token: string): IJwtPayload =>
  jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as IJwtPayload;

export const buildTokenPayload = (user: IUserDocument): IJwtPayload => ({
  userId: (user._id as unknown as { toString(): string }).toString(),
  role: user.role,
  name: user.name,
  email: user.email,
  ...(user.doctorId != null && { doctorId: user.doctorId.toString() }),
});

export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie('refreshToken', { httpOnly: true, path: '/api/auth' });
};
