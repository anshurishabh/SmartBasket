import { Router } from 'express';
import { register, login, storeAdminLogin } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/store-login', storeAdminLogin);

export default router;
