import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Recommendation } from '../models/Recommendation';
import { Inventory } from '../models/Inventory';

export async function getCartRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const { storeId, productIds } = req.body;

    if (!storeId || !Array.isArray(productIds) || productIds.length === 0) {
      res.status(200).json({ success: true, recommendations: [] });
      return;
    }

    // 1. Fetch precomputed recommendation candidates for all products in cart
    const rules = await Recommendation.find({
      key: { $in: productIds.map(String) },
    });

    const candidateScores = new Map<string, number>();

    for (const rule of rules) {
      for (const item of rule.items) {
        const pIdStr = item.productId.toString();
        // Exclude items already present in the cart
        if (!productIds.includes(pIdStr)) {
          const currentScore = candidateScores.get(pIdStr) || 0;
          candidateScores.set(pIdStr, currentScore + item.score);
        }
      }
    }

    const candidateIds = Array.from(candidateScores.keys()).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    if (candidateIds.length === 0) {
      res.status(200).json({ success: true, recommendations: [] });
      return;
    }

    // 2. Dynamic Live Stock Filtering: Only return items in stock at this store
    const availableItems = await Inventory.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: { $in: candidateIds },
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
          pricePaise: '$product.pricePaise',
          imageUrl: '$product.imageUrl',
          availableQuantity: { $subtract: ['$stock', '$reserved'] },
        },
      },
      {
        $match: {
          availableQuantity: { $gt: 0 }, // Live Stock Guard: must have available stock
        },
      },
    ]);

    // 3. Sort by highest association score and return Top 5
    availableItems.sort((a, b) => {
      const scoreA = candidateScores.get(a._id.toString()) || 0;
      const scoreB = candidateScores.get(b._id.toString()) || 0;
      return scoreB - scoreA;
    });

    res.status(200).json({
      success: true,
      placement: 'CART_FORGOT_SOMETHING',
      recommendations: availableItems.slice(0, 5),
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Unable to fetch recommendations.' });
  }
}
