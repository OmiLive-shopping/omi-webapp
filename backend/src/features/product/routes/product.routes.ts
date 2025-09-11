import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requireAdmin, requirePermission } from '../../../middleware/role.middleware.js';
import { validateRequest } from '../../../middleware/validation.middleware.js';
import { ProductController } from '../controllers/product.controller.js';
import { ProductRepository } from '../repositories/product.repository.js';
import {
  createProductSchema,
  productFiltersSchema,
  updateProductSchema,
  wishlistSchema,
} from '../schemas/product.schema.js';
import { ProductService } from '../services/product.service.js';

const router = Router();

// Initialize dependencies
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;
const productRepository = new ProductRepository(prisma);
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

// Public routes
router.get('/', productController.getProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

// Protected routes (require authentication)
router.use(authenticate);

// Admin routes - require admin role
router.post(
  '/',
  requireAdmin,
  validateRequest(createProductSchema),
  productController.createProduct,
);
router.put(
  '/:id',
  requireAdmin,
  validateRequest(updateProductSchema),
  productController.updateProduct,
);
router.patch(
  '/:id',
  requireAdmin,
  validateRequest(updateProductSchema),
  productController.updateProduct,
);
router.delete('/:id', requireAdmin, productController.deleteProduct);

// Wishlist routes
router.post('/wishlist/add', validateRequest(wishlistSchema), productController.addToWishlist);
router.delete('/wishlist/:productId', productController.removeFromWishlist);
router.get('/wishlist/my', productController.getUserWishlist);

export default router;
