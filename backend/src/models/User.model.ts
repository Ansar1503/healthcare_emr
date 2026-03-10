import mongoose, { Schema, type Document, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../types';

// ── Document interface (includes Mongoose Document methods) ──────────────────
export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  doctorId: mongoose.Types.ObjectId | null;
  isActive: boolean;
  refreshToken: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ── Model interface (for statics if needed) ──────────────────────────────────
export type IUserModel = Model<IUserDocument>;

// ── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['super_admin', 'doctor', 'receptionist'] as UserRole[],
      required: [true, 'Role is required'],
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Hooks ─────────────────────────────────────────────────────────────────────
userSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (
  this: IUserDocument,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function (this: IUserDocument) {
  const obj = this.toObject<IUserDocument>();
  delete (obj as Partial<IUserDocument>).password;
  delete (obj as Partial<IUserDocument>).refreshToken;
  return obj;
};

// ── Indexes ───────────────────────────────────────────────────────────────────
// email unique index is created by the unique:true in field definition — no duplicate needed.
// Role index supports admin queries that filter by role.
userSchema.index({ role: 1 });

export const UserModel = mongoose.model<IUserDocument, IUserModel>('User', userSchema);
