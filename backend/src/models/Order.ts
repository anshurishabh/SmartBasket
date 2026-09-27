import { Schema, model, Document, Types } from 'mongoose';

export type OrderStatus =
  | 'PLACED'
  | 'PACKING'
  | 'PACKED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  pricePaise: number;
  quantity: number;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  riderId?: Types.ObjectId;
  items: IOrderItem[];
  totalPaise: number;
  status: OrderStatus;
  statusHistory: Array<{
    status: OrderStatus;
    updatedAt: Date;
    actor: string;
  }>;
  confirmedAt?: Date;
  cancelUntil?: Date;
  idempotencyKey: string;
  deliveryOtp: string;
  address: {
    addressLine: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    riderId: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        pricePaise: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalPaise: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PLACED', 'PACKING', 'PACKED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
      default: 'PLACED',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        actor: { type: String, required: true },
      },
    ],
    confirmedAt: { type: Date },
    cancelUntil: { type: Date },
    idempotencyKey: { type: String, required: true, unique: true },
    deliveryOtp: { type: String, required: true },
    address: {
      addressLine: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', OrderSchema);