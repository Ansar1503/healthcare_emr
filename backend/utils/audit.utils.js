const AuditLog = require('../models/AuditLog.model');

/**
 * Create an audit log entry
 * Non-blocking: errors are caught and logged but don't interrupt request flow
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {string} params.action
 * @param {string} [params.entity]
 * @param {string} [params.entityId]
 * @param {Object} [params.details]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 */
const createAuditLog = async ({
  userId,
  userRole,
  action,
  entity,
  entityId,
  details,
  ipAddress,
  userAgent,
}) => {
  try {
    await AuditLog.create({
      userId,
      userRole,
      action,
      entity,
      entityId,
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Audit logging should never crash the main flow
    console.error('Audit log creation failed:', error.message);
  }
};

/**
 * Extract client info from request object
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'],
});

module.exports = { createAuditLog, getClientInfo };
