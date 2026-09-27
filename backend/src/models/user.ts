import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'rider' | 'store_staff' | 'admin';
  phone: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'rider', 'store_staff', 'admin'],
      default: 'customer',
    },
    phone: { type: String, default: '' },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);