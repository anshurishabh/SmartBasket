import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: string;
  brand: string;
  description: string;
  pricePaise: number; // Integer in paise (e.g. 4500 = ₹45.00)
  imageUrl: string;
  isActive: boolean;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true },
    description: { type: String, default: '' },
    pricePaise: { type: Number, required: true },
    imageUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Product = model<IProduct>('Product', ProductSchema);