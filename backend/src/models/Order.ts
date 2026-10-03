import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  pricePaise: number;
  quantity: number;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  items: IOrderItem[];
  totalPaise: number;
  status: 'PLACED' | 'PACKING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  statusHistory: Array<{
    status: string;
    updatedAt: Date;
    actor: string;
  }>;
  customerDetails: {
    name: string;
    phone: string;
    deliveryAddress: string;
  };
  storeDetails: {
    name: string;
    addressLine: string;
    phone: string;
  };
  riderDetails?: {
    riderId?: Types.ObjectId;
    name?: string;
    phone?: string;
    vehicleNo?: string;
  };
  confirmedAt?: Date;
  cancelUntil?: Date;
  idempotencyKey: string;
  deliveryOtp: string;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
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
      enum: ['PLACED', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        actor: { type: String, required: true },
      },
    ],
    customerDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      deliveryAddress: { type: String, required: true },
    },
    storeDetails: {
      name: { type: String, required: true },
      addressLine: { type: String, required: true },
      phone: { type: String, required: true },
    },
    riderDetails: {
      riderId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      phone: { type: String },
      vehicleNo: { type: String },
    },
    confirmedAt: { type: Date },
    cancelUntil: { type: Date },
    idempotencyKey: { type: String, required: true, unique: true },
    deliveryOtp: { type: String, required: true },
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', OrderSchema);
