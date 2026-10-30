import { Router } from 'express';

import authRoutes from '../routes/auth.routes';
import productRoutes from '../routes/product.routes';
import enquiryRoutes from '../routes/enquiry.routes';

const router = Router();

// Existing authentication routes
router.use(authRoutes);

// Product management routes
router.use(productRoutes);

router.use(enquiryRoutes);

export default router;