import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';

// 1. Get Store Profile & Metrics
export async function getStoreProfile(req: any, res: Response): Promise<void> {
  try {
    const storeId = req.user?.storeId || req.params.storeId;
    const store = await Store.findById(storeId);
    if (!store) {
      res.status(404).json({ code: 'STORE_NOT_FOUND', message: 'Store not found' });
      return;
    }
    res.status(200).json({ success: true, store });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to fetch store details' });
  }
}

// 2. Update Store Details (Name, Timings, Phone, Address)
export async function updateStoreProfile(req: any, res: Response): Promise<void> {
  try {
    const storeId = req.user?.storeId || req.params.storeId;
    const { name, addressLine, phone, openTime, closeTime, serviceRadiusKm } = req.body;

    const store = await Store.findByIdAndUpdate(
      storeId,
      {
        $set: {
          ...(name && { name }),
          ...(addressLine && { addressLine }),
          ...(phone && { phone }),
          ...(openTime && { openTime }),
          ...(closeTime && { closeTime }),
          ...(serviceRadiusKm && { serviceRadiusKm }),
        },
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Store details updated successfully!', store });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to update store details' });
  }
}

// 3. Get Full Store Inventory With Product Details
export async function getStoreInventory(req: any, res: Response): Promise<void> {
  try {
    const storeId = req.user?.storeId || req.params.storeId;

    const items = await Inventory.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          productId: '$product._id',
          name: '$product.name',
          category: '$product.category',
          brand: '$product.brand',
          pricePaise: '$product.pricePaise',
          imageUrl: '$product.imageUrl',
          stock: 1,
          reserved: 1,
          available: { $subtract: ['$stock', '$reserved'] },
        },
      },
    ]);

    res.status(200).json({ success: true, count: items.length, inventory: items });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to fetch inventory' });
  }
}

// 4. Update Stock Quantity for a specific product
export async function updateProductStock(req: any, res: Response): Promise<void> {
  try {
    const storeId = req.user?.storeId || req.params.storeId;
    const { productId, newStock } = req.body;

    if (newStock < 0) {
      res.status(400).json({ code: 'INVALID_STOCK', message: 'Stock cannot be negative' });
      return;
    }

    const inventory = await Inventory.findOneAndUpdate(
      { storeId, productId },
      { $set: { stock: Number(newStock) } },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.to(`store:${storeId}`).emit('stock_updated', { storeId });

    res.status(200).json({ success: true, message: 'Stock updated successfully', inventory });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to update stock' });
  }
}

// 5. Create New Product and assign stock to this store
export async function addNewProduct(req: any, res: Response): Promise<void> {
  try {
    const storeId = req.user?.storeId || req.params.storeId;
    const { name, category, brand, pricePaise, stock } = req.body;

    if (!name || !pricePaise || stock === undefined) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name, price, and initial stock are required' });
      return;
    }

    const product = await Product.create({
      name,
      category: category || 'Daily Essentials',
      brand: brand || 'General',
      pricePaise: Number(pricePaise),
      isActive: true,
    });

    const inventory = await Inventory.create({
      storeId,
      productId: product._id,
      stock: Number(stock),
      reserved: 0,
    });

    const io = req.app.get('io');
    if (io) io.to(`store:${storeId}`).emit('stock_updated', { storeId });

    res.status(201).json({ success: true, message: 'New product added to store inventory!', product, inventory });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to add product' });
  }
}
