import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { authMiddleware } from '../../../middleware/auth-enhanced.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { ProductController } from '../controllers/product.controller';
import { ProductRepository } from '../repositories/product.repository';
import {
  createProductSchema,
  productFiltersSchema,
  updateProductSchema,
  wishlistSchema,
} from '../schemas/product.schema';
import { ProductService } from '../services/product.service';

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
router.use(authMiddleware);

// Admin routes
router.post('/', validateRequest(createProductSchema), productController.createProduct);
router.put('/:id', validateRequest(updateProductSchema), productController.updateProduct);
router.patch('/:id', validateRequest(updateProductSchema), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Wishlist routes
router.post('/wishlist/add', validateRequest(wishlistSchema), productController.addToWishlist);
router.delete('/wishlist/:productId', productController.removeFromWishlist);
router.get('/wishlist/my', productController.getUserWishlist);

export default router;
