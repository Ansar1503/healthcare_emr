import type { FilterQuery, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { UserModel, type IUserDocument } from '../models/User.model';
import type { UserRole } from '../types';

export interface IUserRepository {
  findByEmail(email: string, includeSecrets?: boolean): Promise<IUserDocument | null>;
  findByIdWithSecrets(id: string | Types.ObjectId): Promise<IUserDocument | null>;
  findByRole(role: UserRole): Promise<IUserDocument[]>;
  findActiveUsers(filter?: FilterQuery<IUserDocument>): Promise<IUserDocument[]>;
  setRefreshToken(id: string | Types.ObjectId, token: string | null): Promise<void>;
  setLastLogin(id: string | Types.ObjectId): Promise<void>;
  deactivate(id: string | Types.ObjectId): Promise<IUserDocument | null>;
  activate(id: string | Types.ObjectId): Promise<IUserDocument | null>;
}

export class UserRepository
  extends BaseRepository<IUserDocument>
  implements IUserRepository
{
  constructor() {
    super(UserModel);
  }

  /** Find user by email. Optionally include password + refreshToken fields. */
  async findByEmail(
    email: string,
    includeSecrets = false
  ): Promise<IUserDocument | null> {
    const query = this.model.findOne({ email: email.toLowerCase() });
    if (includeSecrets) {
      query.select('+password +refreshToken');
    }
    return query.exec();
  }

  /** Find user by ID and include hidden secrets (for token rotation). */
  async findByIdWithSecrets(
    id: string | Types.ObjectId
  ): Promise<IUserDocument | null> {
    return this.model.findById(id).select('+refreshToken').exec();
  }

  /** Get all users matching a given role. */
  async findByRole(role: UserRole): Promise<IUserDocument[]> {
    return this.model.find({ role }).sort({ createdAt: -1 }).exec();
  }

  /** Get all active users, optionally scoped by extra filter. */
  async findActiveUsers(
    filter: FilterQuery<IUserDocument> = {}
  ): Promise<IUserDocument[]> {
    return this.model.find({ ...filter, isActive: true }).exec();
  }

  /** Persist a new refresh token (or clear it on logout). */
  async setRefreshToken(
    id: string | Types.ObjectId,
    token: string | null
  ): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, { refreshToken: token }, { validateBeforeSave: false })
      .exec();
  }

  /** Stamp the lastLogin timestamp. */
  async setLastLogin(id: string | Types.ObjectId): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, { lastLogin: new Date() }, { validateBeforeSave: false })
      .exec();
  }

  async deactivate(id: string | Types.ObjectId): Promise<IUserDocument | null> {
    return this.updateById(id, { isActive: false });
  }

  async activate(id: string | Types.ObjectId): Promise<IUserDocument | null> {
    return this.updateById(id, { isActive: true });
  }
}

// Singleton instance
export const userRepository = new UserRepository();
