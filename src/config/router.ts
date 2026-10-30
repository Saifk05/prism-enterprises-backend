import { Router } from 'express';

import authRoutes from '../routes/auth.routes';
import productRoutes from '../routes/product.routes';
import enquiryRoutes from '../routes/enquiry.routes';
import emailRoutes from '../routes/email.routes';

const router = Router();

// Existing authentication routes
router.use(authRoutes);

// Product management routes
router.use(productRoutes);

// Customer enquiry routes
router.use(enquiryRoutes);

// Gmail inbox and reply routes
router.use(emailRoutes);

export default router;