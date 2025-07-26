import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductRepository } from '../repositories/product.repository.js';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    product: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  })),
}));

describe('ProductRepository', () => {
  let prisma: PrismaClient;
  let productRepository: ProductRepository;

  beforeEach(() => {
    prisma = new PrismaClient();
    productRepository = new ProductRepository(prisma);
  });

  it('should create a product', async () => {
    const mockProduct = {
      id: '123',
      name: 'Test Product',
      imageUrl: 'https://example.com/image.jpg',
      description: 'Test description',
      couponCode: 'SAVE10',
      couponExpiration: new Date('2025-12-31'),
      url: 'https://example.com',
      public: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.product.create).mockResolvedValue(mockProduct);

    const result = await productRepository.createProduct({
      name: 'Test Product',
      imageUrl: 'https://example.com/image.jpg',
      description: 'Test description',
      couponCode: 'SAVE10',
      couponExpiration: '2025-12-31',
      url: 'https://example.com',
      public: true,
      active: true,
    });

    expect(result).toEqual(mockProduct);
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Product',
        imageUrl: 'https://example.com/image.jpg',
        description: 'Test description',
        couponCode: 'SAVE10',
        couponExpiration: new Date('2025-12-31'),
        url: 'https://example.com',
        public: true,
        active: true,
      },
    });
  });

  it('should find a product by id', async () => {
    const mockProduct = {
      id: '123',
      name: 'Test Product',
      _count: { wishlistedBy: 5 },
    } as any;

    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct);

    const result = await productRepository.findProductById('123');

    expect(result).toEqual(mockProduct);
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
      include: {
        _count: {
          select: { wishlistedBy: true },
        },
      },
    });
  });

  it('should find products with filters', async () => {
    const mockProducts = [
      { id: '1', name: 'Product 1', public: true, active: true },
      { id: '2', name: 'Product 2', public: true, active: true },
    ] as any;

    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    vi.mocked(prisma.product.count).mockResolvedValue(2);

    const result = await productRepository.findProducts({
      public: true,
      active: true,
      search: 'Product',
      hasActiveCoupon: true,
    });

    expect(result).toEqual({
      products: mockProducts,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        public: true,
        active: true,
        OR: [
          { name: { contains: 'Product', mode: 'insensitive' } },
          { description: { contains: 'Product', mode: 'insensitive' } },
        ],
        AND: [{ couponCode: { not: null } }, { couponExpiration: { gt: expect.any(Date) } }],
      },
      include: {
        _count: {
          select: { wishlistedBy: true },
        },
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('should add product to wishlist', async () => {
    const mockResult = {
      wishlist: [
        { id: '123', name: 'Product 1' },
        { id: '456', name: 'Product 2' },
      ],
    } as any;

    vi.mocked(prisma.user.update).mockResolvedValue(mockResult);

    const result = await productRepository.addToWishlist('user123', 'product456');

    expect(result).toEqual(mockResult);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        wishlist: {
          connect: { id: 'product456' },
        },
      },
      select: {
        wishlist: true,
      },
    });
  });

  it('should check if product is in wishlist', async () => {
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const result = await productRepository.isProductInWishlist('user123', 'product456');

    expect(result).toBe(true);
    expect(prisma.product.count).toHaveBeenCalledWith({
      where: {
        id: 'product456',
        wishlistedBy: {
          some: { id: 'user123' },
        },
      },
    });
  });
});
