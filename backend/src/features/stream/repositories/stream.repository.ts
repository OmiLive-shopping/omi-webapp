import { PrismaClient } from '@prisma/client';

import {
  AddStreamProductInput,
  CommentInput,
  CreateStreamInput,
  StreamFilters,
  UpdateStreamInput,
} from '../types/stream.types';

export class StreamRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async createStream(userId: string, data: CreateStreamInput) {
    return this.prisma.stream.create({
      data: {
        ...data,
        scheduled: new Date(data.scheduled),
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async findStreamById(streamId: string) {
    return this.prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        products: {
          include: {
            product: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async findStreams(filters: StreamFilters) {
    const where: any = {};
    const now = new Date();

    if (filters.isLive !== undefined) {
      where.isLive = filters.isLive;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.upcoming) {
      where.scheduled = { gt: now };
      where.isLive = false;
    }

    if (filters.past) {
      where.endedAt = { not: null };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.stream.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            comments: true,
            products: true,
          },
        },
      },
      orderBy: [{ isLive: 'desc' }, { scheduled: 'asc' }],
    });
  }

  async updateStream(streamId: string, data: UpdateStreamInput) {
    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        ...data,
        scheduled: data.scheduled ? new Date(data.scheduled) : undefined,
      },
    });
  }

  async deleteStream(streamId: string) {
    return this.prisma.stream.delete({
      where: { id: streamId },
    });
  }

  async findStreamByUserStreamKey(streamKey: string) {
    const user = await this.prisma.user.findUnique({
      where: { streamKey },
      select: { id: true },
    });

    if (!user) return null;

    return this.prisma.stream.findFirst({
      where: {
        userId: user.id,
        isLive: false,
        scheduled: {
          lte: new Date(new Date().getTime() + 30 * 60 * 1000), // Within 30 minutes
          gte: new Date(new Date().getTime() - 30 * 60 * 1000), // Not more than 30 minutes ago
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async goLive(streamId: string) {
    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        isLive: true,
        startedAt: new Date(),
      },
    });
  }

  async endStream(streamId: string) {
    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        isLive: false,
        endedAt: new Date(),
        viewerCount: 0,
      },
    });
  }

  async updateViewerCount(streamId: string, count: number) {
    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        viewerCount: count,
      },
    });
  }

  async incrementViewerCount(streamId: string) {
    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        viewerCount: {
          increment: 1,
        },
      },
    });
  }

  async decrementViewerCount(streamId: string) {
    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        viewerCount: {
          decrement: 1,
        },
      },
    });
  }

  async addProductToStream(streamId: string, data: AddStreamProductInput) {
    return this.prisma.streamProduct.create({
      data: {
        streamId,
        productId: data.productId,
        order: data.order || 0,
      },
      include: {
        product: true,
      },
    });
  }

  async removeProductFromStream(streamId: string, productId: string) {
    return this.prisma.streamProduct.deleteMany({
      where: {
        streamId,
        productId,
      },
    });
  }

  async getStreamProducts(streamId: string) {
    return this.prisma.streamProduct.findMany({
      where: { streamId },
      include: {
        product: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async createComment(userId: string, streamId: string, data: CommentInput) {
    return this.prisma.comment.create({
      data: {
        content: data.content,
        userId,
        streamId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async getStreamComments(streamId: string, limit = 100) {
    return this.prisma.comment.findMany({
      where: { streamId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async getStreamStats(streamId: string) {
    const [stream, commentCount, uniqueViewers, productCount, peakViewers] = await Promise.all([
      this.prisma.stream.findUnique({
        where: { id: streamId },
        select: {
          id: true,
          title: true,
          viewerCount: true,
          isLive: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.comment.count({
        where: { streamId },
      }),
      this.prisma.streamViewer.count({
        where: { streamId },
      }),
      this.prisma.streamProduct.count({
        where: { streamId },
      }),
      // Get peak viewer count from StreamViewer records
      this.prisma.streamViewer.groupBy({
        by: ['streamId'],
        where: { streamId },
        _count: {
          id: true,
        },
      }),
    ]);

    if (!stream) {
      return null;
    }

    // Calculate duration if stream has ended
    let duration = 0;
    if (stream.startedAt && stream.endedAt) {
      duration = Math.floor((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000);
    } else if (stream.startedAt && stream.isLive) {
      duration = Math.floor((Date.now() - stream.startedAt.getTime()) / 1000);
    }

    return {
      streamId: stream.id,
      title: stream.title,
      isLive: stream.isLive,
      currentViewers: stream.viewerCount,
      totalUniqueViewers: uniqueViewers,
      peakViewers: peakViewers[0]?._count?.id || stream.viewerCount,
      totalComments: commentCount,
      totalProducts: productCount,
      duration, // in seconds
      startedAt: stream.startedAt,
      endedAt: stream.endedAt,
      createdAt: stream.createdAt,
    };
  }

  async getStreamViewers(streamId: string) {
    return this.prisma.streamViewer.findMany({
      where: {
        streamId,
        leftAt: null, // Only active viewers
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });
  }
}
