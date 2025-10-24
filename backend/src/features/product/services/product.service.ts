import { unifiedResponse } from 'uni-response';

import { ERROR, SUCCESS } from '../../../constants/messages.js';
import { ProductRepository } from '../repositories/product.repository.js';
import {
  CreateProductInput,
  ProductFilters,
  UpdateProductInput,
  WishlistInput,
} from '../types/product.types.js';

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async createProduct(input: CreateProductInput, userId: string) {
    const product = await this.productRepository.createProduct(input);
    return unifiedResponse(true, 'Product created successfully', product);
  }

  async getProducts(filters: ProductFilters) {
    const products = await this.productRepository.findProducts(filters);
    return unifiedResponse(true, 'Products retrieved successfully', products);
  }

  async getProductById(productId: string) {
    const product = await this.productRepository.findProductById(productId);

    if (!product) {
      return unifiedResponse(false, 'Product not found');
    }

    return unifiedResponse(true, 'Product retrieved successfully', product);
  }

  async updateProduct(productId: string, input: UpdateProductInput) {
    const existingProduct = await this.productRepository.findProductById(productId);
    if (!existingProduct) {
      return unifiedResponse(false, 'Product not found');
    }

    const updatedProduct = await this.productRepository.updateProduct(productId, input);
    return unifiedResponse(true, 'Product updated successfully', updatedProduct);
  }

  async deleteProduct(productId: string) {
    const existingProduct = await this.productRepository.findProductById(productId);
    if (!existingProduct) {
      return unifiedResponse(false, 'Product not found');
    }

    await this.productRepository.deleteProduct(productId);
    return unifiedResponse(true, 'Product deleted successfully');
  }

  async addToWishlist(userId: string, { productId }: WishlistInput) {
    const product = await this.productRepository.findProductById(productId);
    if (!product) {
      return unifiedResponse(false, 'Product not found');
    }

    const isAlreadyInWishlist = await this.productRepository.isProductInWishlist(userId, productId);
    if (isAlreadyInWishlist) {
      return unifiedResponse(false, 'Product already in wishlist');
    }

    const result = await this.productRepository.addToWishlist(userId, productId);
    return unifiedResponse(true, 'Product added to wishlist', result);
  }

  async removeFromWishlist(userId: string, productId: string) {
    const isInWishlist = await this.productRepository.isProductInWishlist(userId, productId);
    if (!isInWishlist) {
      return unifiedResponse(false, 'Product not in wishlist');
    }

    const result = await this.productRepository.removeFromWishlist(userId, productId);
    return unifiedResponse(true, 'Product removed from wishlist', result);
  }

  async getUserWishlist(userId: string) {
    const wishlist = await this.productRepository.getUserWishlist(userId);
    return unifiedResponse(true, 'Wishlist retrieved successfully', wishlist);
  }

  async searchProducts(searchQuery: string, filters: ProductFilters) {
    const results = await this.productRepository.searchProducts(searchQuery, filters);
    return unifiedResponse(true, 'Search results retrieved successfully', results);
  }

  // Brand-specific methods
  async getBrandProducts(brandId: string, filters: ProductFilters = {}) {
    // Add brandId to filters to ensure we only get this brand's products
    const brandFilters = { ...filters, brandId };
    const products = await this.productRepository.findProducts(brandFilters);
    return unifiedResponse(true, 'Brand products retrieved successfully', products);
  }

  async createBrandProduct(input: CreateProductInput, brandId: string) {
    // Auto-assign the brandId and set initial approval status
    // MVP: Auto-approve all products submitted by brands
    const brandProductInput = {
      ...input,
      brandId,
      approvalStatus: 'approved', // MVP: Auto-approve for now
      approvedAt: new Date(), // Set approval timestamp
    };

    const product = await this.productRepository.createProduct(brandProductInput);
    return unifiedResponse(true, 'Brand product created successfully', product);
  }
}
