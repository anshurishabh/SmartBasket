import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  placeOrder,
  cancelOrder,
  getOrderById,
  getStoreOrders,
  updateOrderStatus,
  assignRiderToOrder,
  completeDeliveryWithOtp,
} from '../controllers/orderController';

const router = Router();

router.use(protect);

router.post('/', placeOrder);
router.post('/:id/cancel', cancelOrder);
router.get('/store/:storeId', getStoreOrders);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/accept-rider', assignRiderToOrder);
router.post('/:id/verify-otp', completeDeliveryWithOtp);
router.get('/:id', getOrderById);

export default router;
