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

  
  async findByIdWithSecrets(
    id: string | Types.ObjectId
  ): Promise<IUserDocument | null> {
    return this.model.findById(id).select('+refreshToken').exec();
  }

  
  async findByRole(role: UserRole): Promise<IUserDocument[]> {
    return this.model.find({ role }).sort({ createdAt: -1 }).exec();
  }

  
  async findActiveUsers(
    filter: FilterQuery<IUserDocument> = {}
  ): Promise<IUserDocument[]> {
    return this.model.find({ ...filter, isActive: true }).exec();
  }

  
  async setRefreshToken(
    id: string | Types.ObjectId,
    token: string | null
  ): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, { refreshToken: token }, { validateBeforeSave: false })
      .exec();
  }

  
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

export const userRepository = new UserRepository();
