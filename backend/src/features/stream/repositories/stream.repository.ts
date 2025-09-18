import { PrismaClient } from '@prisma/client';

import {
  AddStreamProductInput,
  CommentInput,
  CreateStreamInput,
  StreamFilters,
  UpdateStreamInput,
} from '../types/stream.types.js';

export class StreamRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async createStream(userId: string, data: CreateStreamInput) {
    return this.prisma.stream.create({
      data: {
        ...data,
        scheduled: data.scheduled ? new Date(data.scheduled) : new Date(),
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
            streamMessages: true,
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
            streamMessages: true,
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
    // First check if the stream already has a vdoRoomId
    const existingStream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { vdoRoomId: true },
    });

    // Only generate a new room ID if one doesn't exist
    let vdoRoomId = existingStream?.vdoRoomId;
    if (!vdoRoomId) {
      // Generate VDO.Ninja compatible room ID (alphanumeric only)
      // Remove hyphens and use first 8 chars + timestamp for uniqueness
      const sanitizedId = streamId.replace(/-/g, '').substring(0, 8);
      const timestamp = Date.now().toString(36); // Base36 timestamp
      vdoRoomId = `stream${sanitizedId}${timestamp}`;
    }

    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        isLive: true,
        startedAt: new Date(),
        vdoRoomId: vdoRoomId,
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
        vdoRoomId: null, // Clear the room ID when stream ends
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

  async getStreamChatHistory(
    streamId: string,
    options: {
      before?: string;
      after?: string;
      limit?: number;
      cursor?: string;
      includeDeleted?: boolean;
      orderBy?: 'asc' | 'desc';
    } = {},
  ) {
    const { before, after, limit = 50, cursor, includeDeleted = false, orderBy = 'asc' } = options;

    const where: any = {
      streamId,
      ...(includeDeleted ? {} : { isDeleted: false }),
    };

    // Date range filtering
    if (before || after) {
      where.createdAt = {};
      if (before) where.createdAt.lt = new Date(before);
      if (after) where.createdAt.gt = new Date(after);
    }

    // Cursor-based pagination
    if (cursor) {
      const cursorComment = await this.prisma.comment.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (cursorComment) {
        where.createdAt = where.createdAt || {};
        if (orderBy === 'asc') {
          where.createdAt.gt = cursorComment.createdAt;
        } else {
          where.createdAt.lt = cursorComment.createdAt;
        }
      }
    }

    const comments = await this.prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
      orderBy: {
        createdAt: orderBy,
      },
      take: limit + 1, // Fetch one extra to determine if there are more
    });

    const hasMore = comments.length > limit;
    const messages = hasMore ? comments.slice(0, -1) : comments;
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    // Format messages to match socket format
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      userId: msg.user.id,
      username: msg.user.username,
      avatarUrl: msg.user.avatarUrl,
      role: msg.user.role?.name || 'viewer',
      timestamp: msg.createdAt,
      type: 'message' as const,
      isPinned: msg.isPinned,
      isDeleted: msg.isDeleted,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            content: msg.replyTo.content,
            username: msg.replyTo.user.username,
          }
        : null,
      reactions: msg.reactions.map(r => ({
        emoji: r.emoji,
        userId: r.userId,
      })),
      reactionCount: msg._count.reactions,
    }));

    return {
      messages: formattedMessages,
      hasMore,
      nextCursor,
    };
  }
}
