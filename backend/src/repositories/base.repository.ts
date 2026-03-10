import type { FilterQuery, UpdateQuery, Document, Model, Types } from 'mongoose';
import type { IPaginatedResult, IPaginationOptions } from '../types';

// ── Generic repository contract ───────────────────────────────────────────────
export interface IBaseRepository<TDocument extends Document> {
  findById(id: string | Types.ObjectId): Promise<TDocument | null>;
  findOne(filter: FilterQuery<TDocument>): Promise<TDocument | null>;
  find(filter: FilterQuery<TDocument>): Promise<TDocument[]>;
  findPaginated(
    filter: FilterQuery<TDocument>,
    options: IPaginationOptions,
    sort?: Record<string, 1 | -1>
  ): Promise<IPaginatedResult<TDocument>>;
  create(data: Partial<TDocument>): Promise<TDocument>;
  updateById(
    id: string | Types.ObjectId,
    update: UpdateQuery<TDocument>
  ): Promise<TDocument | null>;
  deleteById(id: string | Types.ObjectId): Promise<TDocument | null>;
  countDocuments(filter: FilterQuery<TDocument>): Promise<number>;
}

// ── Abstract base implementation ──────────────────────────────────────────────
export abstract class BaseRepository<TDocument extends Document>
  implements IBaseRepository<TDocument>
{
  protected readonly model: Model<TDocument>;

  constructor(model: Model<TDocument>) {
    this.model = model;
  }

  async findById(id: string | Types.ObjectId): Promise<TDocument | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: FilterQuery<TDocument>): Promise<TDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async find(filter: FilterQuery<TDocument>): Promise<TDocument[]> {
    return this.model.find(filter).exec();
  }

  async findPaginated(
    filter: FilterQuery<TDocument>,
    options: IPaginationOptions,
    sort: Record<string, 1 | -1> = { createdAt: -1 }
  ): Promise<IPaginatedResult<TDocument>> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: Partial<TDocument>): Promise<TDocument> {
    return this.model.create(data);
  }

  async updateById(
    id: string | Types.ObjectId,
    update: UpdateQuery<TDocument>
  ): Promise<TDocument | null> {
    return this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();
  }

  async deleteById(id: string | Types.ObjectId): Promise<TDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async countDocuments(filter: FilterQuery<TDocument>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
