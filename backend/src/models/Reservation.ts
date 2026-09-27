import { Schema, model, Document, Types } from 'mongoose';

export interface IReservationItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface IReservation extends Document {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  items: IReservationItem[];
  expiresAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const Reservation = model<IReservation>('Reservation', ReservationSchema);