import { PrismaClient } from '@prisma/client';

import { CreateProductInput, ProductFilters, UpdateProductInput } from '../types/product.types';

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

    return this.prisma.product.findMany({
      where,
      include: {
        _count: {
          select: { wishlistedBy: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
}
