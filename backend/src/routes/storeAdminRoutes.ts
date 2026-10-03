import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  getStoreProfile,
  updateStoreProfile,
  getStoreInventory,
  updateProductStock,
  addNewProduct,
} from '../controllers/storeAdminController';

const router = Router();

router.use(protect);

router.get('/profile', getStoreProfile);
router.patch('/profile', updateStoreProfile);
router.get('/inventory', getStoreInventory);
router.patch('/inventory/stock', updateProductStock);
router.post('/inventory/new-product', addNewProduct);

export default router;
