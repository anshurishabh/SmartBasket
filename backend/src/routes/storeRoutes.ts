import { Router } from 'express';
import { getNearestStore } from '../controllers/storeController';

const router = Router();

router.get('/nearest', getNearestStore);

export default router;