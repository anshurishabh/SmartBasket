import { Router } from 'express';
import { getCartRecommendations } from '../controllers/recommendationController';

const router = Router();

router.post('/cart', getCartRecommendations);

export default router;
