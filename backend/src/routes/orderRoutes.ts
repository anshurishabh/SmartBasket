import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  placeOrder,
  cancelOrder,
  getOrderById,
  getUserOrders,
  getStoreOrders,
  updateOrderStatus,
  completeDeliveryWithOtp,
} from '../controllers/orderController';

const router = Router();

router.use(protect);

router.post('/', placeOrder);
router.post('/:id/cancel', cancelOrder);
router.get('/my-orders', getUserOrders);
router.get('/store/:storeId', getStoreOrders);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/verify-otp', completeDeliveryWithOtp);
router.get('/:id', getOrderById);

export default router;
