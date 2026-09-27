import { Schema, model, Document, Types } from 'mongoose';

export interface IInventory extends Document {
  storeId: Types.ObjectId;
  productId: Types.ObjectId;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
}

const InventorySchema = new Schema<IInventory>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
  },
  { timestamps: true }
);

InventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });

export const Inventory = model<IInventory>('Inventory', InventorySchema);