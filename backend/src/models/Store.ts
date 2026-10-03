import { Schema, model, Document } from 'mongoose';

export interface IStore extends Document {
  storeCode: string; // Specific Store ID (e.g. STORE_LKO_01)
  passwordHash: string;
  name: string;
  addressLine: string;
  phone: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  serviceRadiusKm: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

const StoreSchema = new Schema<IStore>(
  {
    storeCode: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    addressLine: { type: String, required: true, default: 'Dark Store Plot #14, Cyber Heights, Gomti Nagar, Lucknow' },
    phone: { type: String, required: true, default: '+91 9123456789' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    serviceRadiusKm: { type: Number, default: 5 },
    openTime: { type: String, default: '06:00' },
    closeTime: { type: String, default: '23:30' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StoreSchema.index({ location: '2dsphere' });

export const Store = model<IStore>('Store', StoreSchema);
