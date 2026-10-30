import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { handleProductImageUpload } from '../middleware/upload.middleware';

const router = Router();

// PUBLIC ROUTES
router.get('/products', ProductController.getPublicProducts);
router.get('/products/categories', ProductController.getCategories);
router.get('/products/:slug', ProductController.getBySlug);

// ADMIN AUTHENTICATION
router.use('/admin/products', AuthMiddleware.authenticate);

// ADMIN PRODUCT CRUD
router.get('/admin/products', ProductController.getAdminProducts);
router.get('/admin/products/:id', ProductController.getById);
router.post('/admin/products', ProductController.create);
router.put('/admin/products/:id', ProductController.update);
router.patch('/admin/products/:id/status', ProductController.updateStatus);
router.delete('/admin/products/:id', ProductController.delete);

// ADMIN PRODUCT IMAGES
router.post('/admin/products/:id/images', handleProductImageUpload, ProductController.uploadImages);
router.delete('/admin/products/:id/images', ProductController.deleteImages);

export default router;