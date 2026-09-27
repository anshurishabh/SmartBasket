import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Inventory } from '../models/Inventory';

export async function getStoreProducts(req: Request, res: Response): Promise<void> {
  try {
    const { storeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({ code: 'INVALID_STORE_ID', message: 'The provided storeId is invalid.' });
      return;
    }

    // Join products catalog with specific store inventory
    const items = await Inventory.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          category: '$product.category',
          brand: '$product.brand',
          description: '$product.description',
          pricePaise: '$product.pricePaise',
          imageUrl: '$product.imageUrl',
          stock: '$stock',
          reserved: '$reserved',
          availableQuantity: { $subtract: ['$stock', '$reserved'] },
          isOutOfStock: { $lte: [{ $subtract: ['$stock', '$reserved'] }, 0] },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('Error fetching store products:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Unable to load products.' });
  }
}