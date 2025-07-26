import { PrismaClient } from '@prisma/client';

export class UserRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isAdmin: true,
        streamKey: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        _count: {
          select: {
            streams: true,
            followers: true,
            following: true,
          },
        },
      },
    });
  }

  async createUser(data: { email: string; username: string; password: string; firstName: string; streamKey?: string }) {
    return this.prisma.user.create({
      data,
      include: {
        role: true,
      },
    });
  }

  async findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
      },
    });
  }

  async findUserByStreamKey(streamKey: string) {
    return this.prisma.user.findUnique({
      where: { streamKey },
      select: {
        id: true,
        username: true,
        streamKey: true,
      },
    });
  }

  async findPublicProfile(userId: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            streams: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) return null;

    // Check if viewer is following this user
    let isFollowing = false;
    if (viewerId && viewerId !== userId) {
      isFollowing = await this.isFollowing(viewerId, userId);
    }

    return {
      ...user,
      isFollowing,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      streamCount: user._count.streams,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      avatarUrl?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isAdmin: true,
        streamKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async checkUsernameAvailable(username: string, excludeUserId?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        username,
        NOT: excludeUserId ? { id: excludeUserId } : undefined,
      },
    });
    return !user;
  }

  async checkEmailAvailable(email: string, excludeUserId?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        NOT: excludeUserId ? { id: excludeUserId } : undefined,
      },
    });
    return !user;
  }

  async followUser(followerId: string, followingId: string) {
    return this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    return this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return !!follow;
  }

  async getFollowers(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.follow.count({
        where: { followingId: userId },
      }),
    ]);

    return {
      data: followers.map(f => f.follower),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getFollowing(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      data: following.map(f => f.following),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getFollowCounts(userId: string) {
    const [followersCount, followingCount] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      followersCount,
      followingCount,
    };
  }

  async regenerateStreamKey(userId: string) {
    // First, we need to manually generate a new cuid since Prisma won't regenerate on update
    const { customAlphabet } = await import('nanoid');
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const nanoid = customAlphabet(alphabet, 25);
    const newStreamKey = nanoid();

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        streamKey: newStreamKey,
      },
      select: {
        id: true,
        streamKey: true,
      },
    });
  }
}
