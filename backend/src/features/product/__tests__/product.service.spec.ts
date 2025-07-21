import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductRepository } from '../repositories/product.repository';
import { ProductService } from '../services/product.service';

vi.mock('../repositories/product.repository');

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: any;

  beforeEach(() => {
    mockProductRepository = {
      createProduct: vi.fn(),
      findProductById: vi.fn(),
      findProducts: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
      addToWishlist: vi.fn(),
      removeFromWishlist: vi.fn(),
      getUserWishlist: vi.fn(),
      isProductInWishlist: vi.fn(),
    };
    productService = new ProductService(mockProductRepository);
  });

  it('should create a product when user is admin', async () => {
    const mockProduct = { id: '123', name: 'Test Product' };
    mockProductRepository.createProduct.mockResolvedValue(mockProduct);

    const result = await productService.createProduct({ name: 'Test Product' }, 'userId');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Product created successfully');
    expect(result.data).toEqual(mockProduct);
  });

  // Note: Admin check is now handled at the middleware layer, not in the service

  it('should get products with filters', async () => {
    const mockProducts = [
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
    ];
    mockProductRepository.findProducts.mockResolvedValue(mockProducts);

    const result = await productService.getProducts({ public: true });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProducts);
    expect(mockProductRepository.findProducts).toHaveBeenCalledWith({ public: true });
  });

  it('should get product by id', async () => {
    const mockProduct = { id: '123', name: 'Test Product' };
    mockProductRepository.findProductById.mockResolvedValue(mockProduct);

    const result = await productService.getProductById('123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProduct);
  });

  it('should return error when product not found', async () => {
    mockProductRepository.findProductById.mockResolvedValue(null);

    const result = await productService.getProductById('123');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Product not found');
  });

  it('should add product to wishlist', async () => {
    const mockProduct = { id: '123', name: 'Test Product' };
    const mockWishlist = { wishlist: [mockProduct] };

    mockProductRepository.findProductById.mockResolvedValue(mockProduct);
    mockProductRepository.isProductInWishlist.mockResolvedValue(false);
    mockProductRepository.addToWishlist.mockResolvedValue(mockWishlist);

    const result = await productService.addToWishlist('userId', { productId: '123' });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Product added to wishlist');
    expect(result.data).toEqual(mockWishlist);
  });

  it('should not add product to wishlist if already exists', async () => {
    const mockProduct = { id: '123', name: 'Test Product' };

    mockProductRepository.findProductById.mockResolvedValue(mockProduct);
    mockProductRepository.isProductInWishlist.mockResolvedValue(true);

    const result = await productService.addToWishlist('userId', { productId: '123' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Product already in wishlist');
    expect(mockProductRepository.addToWishlist).not.toHaveBeenCalled();
  });

  it('should update product when user is admin', async () => {
    const existingProduct = { id: '123', name: 'Old Name' };
    const updatedProduct = { id: '123', name: 'New Name' };

    mockProductRepository.findProductById.mockResolvedValue(existingProduct);
    mockProductRepository.updateProduct.mockResolvedValue(updatedProduct);

    const result = await productService.updateProduct('123', { name: 'New Name' });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Product updated successfully');
    expect(result.data).toEqual(updatedProduct);
  });
});
