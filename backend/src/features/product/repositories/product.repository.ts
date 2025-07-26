import { PrismaClient } from '@prisma/client';

import { CreateProductInput, ProductFilters, UpdateProductInput } from '../types/product.types.js';

export class ProductRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async createProduct(data: CreateProductInput) {
    return this.prisma.product.create({
      data: {
        ...data,
        couponExpiration: data.couponExpiration ? new Date(data.couponExpiration) : null,
      },
    });
  }

  async findProductById(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: { wishlistedBy: true },
        },
      },
    });
  }

  async findProducts(filters: ProductFilters) {
    const where: any = {};

    if (filters.public !== undefined) {
      where.public = filters.public;
    }

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.hasActiveCoupon) {
      where.AND = [{ couponCode: { not: null } }, { couponExpiration: { gt: new Date() } }];
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.featured !== undefined) {
      where.featured = filters.featured;
    }

    if (filters.inStock !== undefined) {
      where.inStock = filters.inStock;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Sorting
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          _count: {
            select: { wishlistedBy: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateProduct(productId: string, data: UpdateProductInput) {
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...data,
        couponExpiration:
          data.couponExpiration !== undefined
            ? data.couponExpiration
              ? new Date(data.couponExpiration)
              : null
            : undefined,
      },
    });
  }

  async deleteProduct(productId: string) {
    return this.prisma.product.delete({
      where: { id: productId },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        wishlist: {
          connect: { id: productId },
        },
      },
      select: {
        wishlist: true,
      },
    });
  }

  async removeFromWishlist(userId: string, productId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        wishlist: {
          disconnect: { id: productId },
        },
      },
      select: {
        wishlist: true,
      },
    });
  }

  async getUserWishlist(userId: string) {
    return this.prisma.product.findMany({
      where: {
        wishlistedBy: {
          some: { id: userId },
        },
      },
      include: {
        _count: {
          select: { wishlistedBy: true },
        },
      },
    });
  }

  async isProductInWishlist(userId: string, productId: string) {
    const count = await this.prisma.product.count({
      where: {
        id: productId,
        wishlistedBy: {
          some: { id: userId },
        },
      },
    });
    return count > 0;
  }

  async searchProducts(searchQuery: string, filters: ProductFilters) {
    const where: any = {
      AND: [
        {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { tags: { hasSome: searchQuery.split(' ') } },
          ],
        },
      ],
    };

    // Apply additional filters
    if (filters.public !== undefined) {
      where.public = filters.public;
    }

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.featured !== undefined) {
      where.featured = filters.featured;
    }

    if (filters.inStock !== undefined) {
      where.inStock = filters.inStock;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Sorting - for search, default to relevance (name match first)
    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          _count: {
            select: { wishlistedBy: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      searchQuery,
    };
  }
}
