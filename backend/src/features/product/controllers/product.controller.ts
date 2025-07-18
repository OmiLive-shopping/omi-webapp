import { Request, Response } from 'express';

import { ProductService } from '../services/product.service';
import {
  CreateProductInput,
  ProductFilters,
  UpdateProductInput,
  WishlistInput,
} from '../types/product.types';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  createProduct = async (req: Request, res: Response) => {
    const input: CreateProductInput = req.body;
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.isAdmin || false;

    const result = await this.productService.createProduct(input, userId, isAdmin);
    res.status(result.success ? 201 : 403).json(result);
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
    const isAdmin = (req as any).user.isAdmin || false;

    const result = await this.productService.updateProduct(id, input, isAdmin);
    res
      .status(result.success ? 200 : result.message.includes('Unauthorized') ? 403 : 404)
      .json(result);
  };

  deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const isAdmin = (req as any).user.isAdmin || false;

    const result = await this.productService.deleteProduct(id, isAdmin);
    res
      .status(result.success ? 200 : result.message.includes('Unauthorized') ? 403 : 404)
      .json(result);
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
}
