import { Request, Response } from 'express';
import { unifiedResponse } from 'uni-response';

import { PrismaService } from '../../../config/prisma.config.js';
import { BrandProductFilters } from '../schemas/brand-product.schema.js';
import { ProductService } from '../services/product.service.js';

export class BrandProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Get products for the authenticated brand
   */
  getBrandProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(unifiedResponse(false, 'Authentication required'));
        return;
      }

      // Get the brand ID for this user
      const prismaService = PrismaService.getInstance();
      const prisma = prismaService.client;

      const brand = await prisma.brand.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });

      if (!brand) {
        res.status(404).json(unifiedResponse(false, 'Brand not found for this user'));
        return;
      }

      // Parse query filters
      const filters: BrandProductFilters = {
        ...req.query,
        // Convert string parameters to appropriate types
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        public:
          req.query.public === 'true' ? true : req.query.public === 'false' ? false : undefined,
        active:
          req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
        inStock:
          req.query.inStock === 'true' ? true : req.query.inStock === 'false' ? false : undefined,
        featured:
          req.query.featured === 'true' ? true : req.query.featured === 'false' ? false : undefined,
        hasActiveCoupon:
          req.query.hasActiveCoupon === 'true'
            ? true
            : req.query.hasActiveCoupon === 'false'
              ? false
              : undefined,
        lowStock:
          req.query.lowStock === 'true' ? true : req.query.lowStock === 'false' ? false : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',').filter(Boolean) : undefined,
      };

      const response = await this.productService.getBrandProducts(brand.id, filters);

      if (response.success) {
        res.status(200).json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error getting brand products:', error);
      res.status(500).json(unifiedResponse(false, 'Internal server error'));
    }
  };

  /**
   * Create a new product for the authenticated brand
   */
  createBrandProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(unifiedResponse(false, 'Authentication required'));
        return;
      }

      // Get the brand ID for this user
      const prismaService = PrismaService.getInstance();
      const prisma = prismaService.client;

      const brand = await prisma.brand.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });

      if (!brand) {
        res.status(404).json(unifiedResponse(false, 'Brand not found for this user'));
        return;
      }

      const response = await this.productService.createBrandProduct(req.body, brand.id);

      if (response.success) {
        res.status(201).json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error creating brand product:', error);
      res.status(500).json(unifiedResponse(false, 'Internal server error'));
    }
  };
}
