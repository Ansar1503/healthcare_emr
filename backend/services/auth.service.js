const User = require('../models/User.model');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../utils/jwt.utils');
const { createAuditLog, getClientInfo } = require('../utils/audit.utils');

class AuthService {
  /**
   * Login user
   */
  async login(email, password, req) {
    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');

    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    if (!user.isActive) {
      throw Object.assign(new Error('Account has been deactivated'), { statusCode: 403 });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store hashed refresh token in DB
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Audit log
    await createAuditLog({
      userId: user._id,
      userRole: user.role,
      action: 'LOGIN',
      details: { email: user.email },
      ...getClientInfo(req),
    });

    return { user, accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token from cookie
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw Object.assign(new Error('Refresh token not found'), { statusCode: 401 });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
    }

    // Verify refresh token matches what's stored in DB
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw Object.assign(new Error('Refresh token reuse detected or session expired'), {
        statusCode: 401,
      });
    }

    if (!user.isActive) {
      throw Object.assign(new Error('Account has been deactivated'), { statusCode: 403 });
    }

    const payload = buildTokenPayload(user);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Rotate refresh token
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
  }

  /**
   * Logout user - invalidate refresh token
   */
  async logout(userId, req) {
    const user = await User.findById(userId);

    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });

      await createAuditLog({
        userId: user._id,
        userRole: user.role,
        action: 'LOGOUT',
        ...getClientInfo(req),
      });
    }
  }
}

module.exports = new AuthService();
