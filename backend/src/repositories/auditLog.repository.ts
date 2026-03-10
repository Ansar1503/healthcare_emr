import { BaseRepository } from './base.repository';
import { AuditLogModel, type IAuditLogDocument } from '../models/AuditLog.model';
import type { IAuditLogDTO } from '../types';

export interface IAuditLogRepository {
  log(dto: IAuditLogDTO): Promise<void>;
}

export class AuditLogRepository
  extends BaseRepository<IAuditLogDocument>
  implements IAuditLogRepository
{
  constructor() {
    super(AuditLogModel);
  }

  /**
   * Non-blocking audit entry creation.
   * Errors are swallowed so audit failures never disrupt the main request flow.
   */
  async log(dto: IAuditLogDTO): Promise<void> {
    try {
      await this.model.create(dto);
    } catch (err) {
      console.error('[AuditLog] Failed to write audit entry:', (err as Error).message);
    }
  }
}

export const auditLogRepository = new AuditLogRepository();
