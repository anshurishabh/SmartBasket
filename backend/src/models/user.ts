import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: 'customer' | 'rider' | 'store_admin';
  vehicleNo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['customer', 'rider', 'store_admin'], default: 'customer' },
    vehicleNo: { type: String, default: '' },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
