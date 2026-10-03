import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { User } from '../models/User';

export async function placeOrder(req: AuthRequest, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Session expired. Please login again.' });
      await session.abortTransaction();
      return;
    }

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

    const [store, customer] = await Promise.all([
      Store.findById(storeId).session(session),
      User.findById(userId).session(session),
    ]);

    if (!store) {
      res.status(404).json({ code: 'STORE_NOT_FOUND', message: 'Dark store not found.' });
      await session.abortTransaction();
      return;
    }

    let calculatedTotalPaise = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        throw new Error('Product unavailable.');
      }

      const inventoryUpdate = await Inventory.findOneAndUpdate(
        {
          storeId,
          productId: item.productId,
          $expr: { $gte: [{$subtract: ['$stock', '$reserved'] }, item.quantity] },
        },
        { $inc: { reserved: item.quantity } },
        { session, returnDocument: 'after' }
      );

      if (!inventoryUpdate) {
        throw new Error(`Item ${product.name} went out of stock.`);
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
          userId: new mongoose.Types.ObjectId(userId),
          storeId,
          items: orderItems,
          totalPaise: calculatedTotalPaise,
          status: 'PLACED',
          statusHistory: [{ status: 'PLACED', updatedAt: now, actor: 'customer' }],
          customerDetails: {
            name: customer?.name || 'Customer',
            phone: customer?.phone || '+91 9839012345',
            deliveryAddress: address.addressLine || 'Lucknow, Uttar Pradesh',
          },
          storeDetails: {
            name: store.name,
            addressLine: store.addressLine,
            phone: store.phone,
          },
          confirmedAt: now,
          cancelUntil,
          idempotencyKey,
          deliveryOtp,
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

    res.status(201).json({ success: true, order, cancelUntil: cancelUntil.toISOString() });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ code: 'ORDER_FAILED', message: error.message });
  } finally {
    session.endSession();
  }
}

export async function cancelOrder(req: AuthRequest, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const now = new Date();

    const order = await Order.findOneAndUpdate(
      { _id: id, userId, status: 'PLACED', cancelUntil: { $gte: now } },
      {
        $set: { status: 'CANCELLED' },$push: { statusHistory: { status: 'CANCELLED', updatedAt: now, actor: 'customer' } },
      },
      { session, returnDocument: 'after' }
    );

    if (!order) {
      res.status(400).json({ code: 'CANCELLATION_EXPIRED', message: 'Cancellation window expired.' });
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
      io.to(`order:${order._id}`).emit('status_changed', { orderId: order._id, status: 'CANCELLED' });
      io.to(`store:${order.storeId}`).emit('stock_updated', { storeId: order.storeId });
    }

    res.status(200).json({ success: true, message: 'Order cancelled.', order });
  } catch (e) {
    await session.abortTransaction();
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to cancel.' });
  } finally {
    session.endSession();
  }
}

export async function getStoreOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const storeId = req.params.storeId || req.user?.storeId;
    const orders = await Order.find({ storeId }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to get orders' });
  }
}

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
      { returnDocument: 'after' }
    );

    if (!order) {
      res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('status_changed', { orderId: order._id, status, order });
      io.to(`store:${order.storeId}`).emit('store_order_updated', order);
      if (status === 'READY_FOR_PICKUP') {
        io.emit('rider_offer', order);
      }
    }

    res.status(200).json({ success: true, order });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to update status' });
  }
}

export async function assignRiderToOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const riderId = req.user?.userId || req.user?.id;
    const rider = await User.findById(riderId);

    if (!rider) {
      res.status(404).json({ code: 'RIDER_NOT_FOUND', message: 'Rider not found' });
      return;
    }

    const now = new Date();
    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: {           status: 'OUT_FOR_DELIVERY',           riderDetails: {             riderId: rider._id,             name: rider.name,             phone: rider.phone,             vehicleNo: rider.vehicleNo || 'UP-32-SB-2026',           },         },$push: { statusHistory: { status: 'OUT_FOR_DELIVERY', updatedAt: now, actor: 'rider' } },
      },
      { returnDocument: 'after' }
    );

    const io = req.app.get('io');
    if (io && order) {
      io.to(`order:${order._id}`).emit('status_changed', { orderId: order._id, status: 'OUT_FOR_DELIVERY', order });
      io.to(`store:${order.storeId}`).emit('store_order_updated', order);
    }

    res.status(200).json({ success: true, order });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to assign rider' });
  }
}

export async function completeDeliveryWithOtp(req: AuthRequest, res: Response): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { otp } = req.body;

    const order = await Order.findById(id).session(session);
    if (!order) {
      res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
      await session.abortTransaction();
      return;
    }

    if (order.deliveryOtp !== otp) {
      res.status(400).json({ code: 'INVALID_OTP', message: 'Incorrect OTP. Ask the customer.' });
      await session.abortTransaction();
      return;
    }

    const now = new Date();
    order.status = 'DELIVERED';
    order.statusHistory.push({ status: 'DELIVERED', updatedAt: now, actor: 'rider' });
    await order.save({ session });

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
      io.to(`order:${order._id}`).emit('status_changed', { orderId: order._id, status: 'DELIVERED', order });
      io.to(`store:${order.storeId}`).emit('store_order_updated', order);
    }

    res.status(200).json({ success: true, message: 'Delivered successfully!', order });
  } catch (e) {
    await session.abortTransaction();
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Delivery confirmation failed.' });
  } finally {
    session.endSession();
  }
}

export async function getOrderById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }
    res.status(200).json({ success: true, order });
  } catch (e) {
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Failed to fetch order' });
  }
}
