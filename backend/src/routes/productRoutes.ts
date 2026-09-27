import { Router } from 'express';
import { getStoreProducts } from '../controllers/productController';

const router = Router();

router.get('/store/:storeId', getStoreProducts);

export default router;