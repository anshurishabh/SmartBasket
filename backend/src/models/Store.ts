import { Schema, model, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  serviceRadiusKm: number;
  openTime: string; // "06:00"
  closeTime: string; // "23:59"
  timezone: string;
  lastOrderBeforeCloseMin: number;
  manualStatus: 'OPEN' | 'CLOSED_TEMPORARILY';
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    serviceRadiusKm: { type: Number, required: true, default: 5 },
    openTime: { type: String, required: true, default: '06:00' },
    closeTime: { type: String, required: true, default: '23:59' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    lastOrderBeforeCloseMin: { type: Number, default: 15 },
    manualStatus: {
      type: String,
      enum: ['OPEN', 'CLOSED_TEMPORARILY'],
      default: 'OPEN',
    },
  },
  { timestamps: true }
);

StoreSchema.index({ location: '2dsphere' });

export const Store = model<IStore>('Store', StoreSchema);