import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { evaluateStoreHours } from '../utils/storeHours';

export async function placeOrder(req: AuthRequest, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.userId;
    const { storeId, items, address, idempotencyKey } = req.body;

    if (!items || !items.length || !storeId || !address || !idempotencyKey) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Missing required order fields.' });
      await session.abortTransaction();
      return;
    }

    const existingOrder = await Order.findOne({ idempotencyKey }).session(session);
    if (existingOrder) {
      await session.abortTransaction();
      res.status(200).json({ success: true, order: existingOrder, duplicate: true });
      return;
    }

    const store = await Store.findById(storeId).session(session);
    if (!store) {
      res.status(404).json({ code: 'STORE_NOT_FOUND', message: 'Selected dark store does not exist.' });
      await session.abortTransaction();
      return;
    }

    const operationalStatus = evaluateStoreHours(store);
    if (!operationalStatus.canAcceptOrders) {
      res.status(400).json({
        code: 'STORE_CLOSED',
        message: operationalStatus.reason || 'The store is currently not accepting orders.',
      });
      await session.abortTransaction();
      return;
    }

    let calculatedTotalPaise = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} is unavailable.`);
      }

      const inventoryUpdate = await Inventory.findOneAndUpdate(
        {
          storeId,
          productId: item.productId,
          $expr: { $gte: [{$subtract: ['$stock', '$reserved'] }, item.quantity] },
        },
        { $inc: { reserved: item.quantity } },
        { session, new: true }
      );

      if (!inventoryUpdate) {
        throw new Error(`Item ${product.name} just went out of stock.`);
      }

      calculatedTotalPaise += product.pricePaise * item.quantity;
      orderItems.push({
        productId: product._id,
        name: product.name,
        pricePaise: product.pricePaise,
        quantity: item.quantity,
      });
    }

    const now = new Date();
    const cancelUntil = new Date(now.getTime() + 10 * 1000);
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const [order] = await Order.create(
      [
        {
          userId,
          storeId,
          items: orderItems,
          totalPaise: calculatedTotalPaise,
          status: 'PLACED',
          statusHistory: [{ status: 'PLACED', updatedAt: now, actor: 'customer' }],
          confirmedAt: now,
          cancelUntil,
          idempotencyKey,
          deliveryOtp,
          address: {
            addressLine: address.addressLine,
            location: {
              type: 'Point',
              coordinates: address.coordinates || [80.9995, 26.8525],
            },
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      io.to(`store:${storeId}`).emit('new_order', order);
      io.to(`store:${storeId}`).emit('stock_updated', { storeId });
    }

    res.status(201).json({
      success: true,
      order,
      cancelUntil: cancelUntil.toISOString(),
      serverNow: now.toISOString(),
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Order creation error:', error);
    res.status(400).json({
      code: 'ORDER_FAILED',
      message: error.message || 'Unable to place order due to stock unavailability.',
    });
  } finally {
    session.endSession();
  }
}

export async function cancelOrder(req: AuthRequest, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const now = new Date();

    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        userId,
        status: 'PLACED',
        cancelUntil: { $gte: now },
      },
      {
        $set: { status: 'CANCELLED' },$push: {
          statusHistory: { status: 'CANCELLED', updatedAt: now, actor: 'customer' },
        },
      },
      { session, new: true }
    );

    if (!order) {
      res.status(400).json({
        code: 'CANCELLATION_EXPIRED',
        message: "Orders can't be cancelled 10 seconds after they're placed.",
      });
      await session.abortTransaction();
      return;
    }

    for (const item of order.items) {
      await Inventory.findOneAndUpdate(
        { storeId: order.storeId, productId: item.productId },
        { $inc: { reserved: -item.quantity } },
        { session }
      );
    }

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('order_cancelled', { orderId: order._id });
      io.to(`store:${order.storeId}`).emit('stock_updated', { storeId: order.storeId });
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. Full refund initiated.',
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Order cancel error:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Unable to cancel order.' });
  } finally {
    session.endSession();
  }
}

// Store Staff: Get Active Store Orders
export async function getStoreOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { storeId } = req.params;
    const orders = await Order.find({ storeId }).sort({ createdAt: -1 }).limit(30);
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Unable to load store orders.' });
  }
}

// Update Order Status (PACKING, READY_FOR_PICKUP, OUT_FOR_DELIVERY)
export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, actor } = req.body;
    const now = new Date();

    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: { status },$push: { statusHistory: { status, updatedAt: now, actor: actor || 'staff' } },
      },
      { new: true }
    );

    if (!order) {
      res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('status_changed', { orderId: order._id, status });
      io.to(`store:${order.storeId}`).emit('store_order_updated', order);
      if (status === 'READY_FOR_PICKUP') {
        io.emit('rider_offer', order); // Broadcast to riders
      }
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to update order status.' });
  }
}

// Rider: Complete Delivery using OTP verification
export async function completeDeliveryWithOtp(req: AuthRequest, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { otp } = req.body;

    const order = await Order.findById(id).session(session);
    if (!order) {
      res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      await session.abortTransaction();
      return;
    }

    if (order.deliveryOtp !== otp) {
      res.status(400).json({ code: 'INVALID_OTP', message: 'Incorrect OTP. Please confirm with customer.' });
      await session.abortTransaction();
      return;
    }

    const now = new Date();
    order.status = 'DELIVERED';
    order.statusHistory.push({ status: 'DELIVERED', updatedAt: now, actor: 'rider' });
    await order.save({ session });

    // Deduct stock permanently from inventory
    for (const item of order.items) {
      await Inventory.findOneAndUpdate(
        { storeId: order.storeId, productId: item.productId },
        { $inc: { stock: -item.quantity, reserved: -item.quantity } },
        { session }
      );
    }

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('status_changed', { orderId: order._id, status: 'DELIVERED' });
      io.to(`store:${order.storeId}`).emit('store_order_updated', order);
    }

    res.status(200).json({ success: true, message: 'Order delivered successfully!', order });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Delivery confirmation failed.' });
  } finally {
    session.endSession();
  }
}

export async function getOrderById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    }

    const now = new Date();
    const canCancel = order.status === 'PLACED' && order.cancelUntil ? now <= order.cancelUntil : false;

    res.status(200).json({
      success: true,
      order,
      serverNow: now.toISOString(),
      canCancel,
      secondsRemaining: canCancel && order.cancelUntil
        ? Math.max(0, Math.ceil((order.cancelUntil.getTime() - now.getTime()) / 1000))
        : 0,
    });
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Unable to fetch order.' });
  }
}

export async function getUserOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Unable to load orders.' });
  }
}
