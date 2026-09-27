import { Router } from 'express';
import { protect } from '../middleware/auth';
import { createPaymentOrder, verifyPaymentSignature } from '../controllers/paymentController';

const router = Router();

router.use(protect);

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPaymentSignature);

export default router;
