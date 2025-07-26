import { Request, Response } from 'express';

import { ProductService } from '../services/product.service.js';
import {
  CreateProductInput,
  ProductFilters,
  UpdateProductInput,
  WishlistInput,
} from '../types/product.types.js';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  createProduct = async (req: Request, res: Response) => {
    const input: CreateProductInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.productService.createProduct(input, userId);
    res.status(result.success ? 201 : 400).json(result);
  };

  getProducts = async (req: Request, res: Response) => {
    const filters: ProductFilters = req.query as any;
    const result = await this.productService.getProducts(filters);
    res.status(200).json(result);
  };

  getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.productService.getProductById(id);
    res.status(result.success ? 200 : 404).json(result);
  };

  updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const input: UpdateProductInput = req.body;

    const result = await this.productService.updateProduct(id, input);
    res.status(result.success ? 200 : 404).json(result);
  };

  deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.productService.deleteProduct(id);
    res.status(result.success ? 200 : 404).json(result);
  };

  addToWishlist = async (req: Request, res: Response) => {
    const input: WishlistInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.productService.addToWishlist(userId, input);
    res.status(result.success ? 200 : 404).json(result);
  };

  removeFromWishlist = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const userId = (req as any).user.id;

    const result = await this.productService.removeFromWishlist(userId, productId);
    res.status(result.success ? 200 : 404).json(result);
  };

  getUserWishlist = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    const result = await this.productService.getUserWishlist(userId);
    res.status(200).json(result);
  };

  searchProducts = async (req: Request, res: Response) => {
    const { q, ...filters } = req.query;
    const searchQuery = q as string;

    if (!searchQuery || searchQuery.trim() === '') {
      res.status(400).json({ success: false, message: 'Search query is required' });
      return;
    }

    const result = await this.productService.searchProducts(searchQuery, filters as ProductFilters);
    res.status(200).json(result);
  };
}
