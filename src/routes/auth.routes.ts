import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const limit = rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/auth/login', limit, AuthController.login);
router.get('/auth/me', AuthMiddleware.authenticate, AuthController.me);
router.post('/auth/forgot-password', limit, AuthController.forgotPassword);
router.post('/auth/reset-password', limit, AuthController.resetPassword);
router.post('/auth/refresh', limit, AuthController.refresh);
router.post('/auth/logout', AuthController.logout);

export default router;