import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config.js';
import { authMiddleware } from '../../../middleware/auth-enhanced.middleware.js';
import { requireBrand, requireBrandOwnership } from '../../../middleware/role.middleware.js';
import { validateRequest } from '../../../middleware/validation.middleware.js';
import { ProductController } from '../controllers/product.controller.js';
import { BrandProductController } from '../controllers/brand-product.controller.js';
import { ProductRepository } from '../repositories/product.repository.js';
import {
  createBrandProductSchema,
  updateBrandProductSchema,
} from '../schemas/brand-product.schema.js';
import { ProductService } from '../services/product.service.js';

const router = Router();

// Initialize dependencies - reuse existing infrastructure
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;
const productRepository = new ProductRepository(prisma);
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);
const brandProductController = new BrandProductController(productService);

// All routes require authentication and brand role
router.use(authMiddleware);
router.use(requireBrand);

// Brand product management endpoints
// GET /api/v1/brands/products - List brand's own products
router.get('/', brandProductController.getBrandProducts);

// POST /api/v1/brands/products - Create new product
router.post(
  '/',
  validateRequest(createBrandProductSchema),
  brandProductController.createBrandProduct,
);

// PUT /api/v1/brands/products/:id - Update existing product
router.put(
  '/:id',
  requireBrandOwnership('id'),
  validateRequest(updateBrandProductSchema),
  productController.updateProduct,
);

// DELETE /api/v1/brands/products/:id - Soft delete product
router.delete('/:id', requireBrandOwnership('id'), productController.deleteProduct);

export default router;
