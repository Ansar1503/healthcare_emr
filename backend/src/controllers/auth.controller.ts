import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/jwt.utils';
import type { LoginInput } from '../validation/schemas';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const { user, accessToken, refreshToken } = await authService.login(email, password, req);

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          doctorId: user.doctorId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = (req.cookies as Record<string, string | undefined>).refreshToken;
    const { accessToken, refreshToken: newRefreshToken, user } =
      await authService.refreshAccessToken(refreshToken);

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          doctorId: user.doctorId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authService.logout(req.user!.userId, req);
    clearRefreshTokenCookie(res);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = (req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: req.user });
};
