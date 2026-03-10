import type { Request } from 'express';
import { auditLogRepository } from '../repositories';
import type { IAuditLogDTO } from '../types';

export const createAuditLog = (dto: IAuditLogDTO): void => {
  // Fire-and-forget — do not await; must never block a response
  void auditLogRepository.log(dto);
};

export const getClientInfo = (
  req: Request
): Pick<IAuditLogDTO, 'ipAddress' | 'userAgent'> => ({
  ipAddress: req.ip ?? req.socket?.remoteAddress,
  userAgent: req.headers['user-agent'],
});
