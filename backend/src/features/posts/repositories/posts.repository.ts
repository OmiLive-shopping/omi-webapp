import { PrismaClient } from '@prisma/client';

/**
 * Repository-level data shape for a post
 * (matches Prisma return types)
 */
export interface UserPost {
  id: string;
  userId: string;
  postDescription: string;
  postImage?: string | null;
  likes: number;
  createdAt: string; // JSON string
  user: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  comments: {
    id: string;
    userId: string;
    comment: string;
    likes: number;
    createdAt: string;
    user: {
      id: string;
      username: string;
      name: string | null;
      avatarUrl: string | null;
    };
  }[];
}


export class PostsRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Fetch all posts for the community page
   */
  async getAllPosts(limit?: number, skip?: number): Promise<UserPost[]> {
    return this.prisma.post.findMany({
      take: limit,
      skip,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userId: true,
        postDescription: true,
        postImage: true,
        likes: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            userId: true,
            comment: true,
            likes: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Fetch posts created by a specific user
   */
  async getPostsByUser(
    userId: string,
    limit?: number,
    skip?: number,
  ): Promise<UserPost[]> {
    return this.prisma.post.findMany({
      where: { userId },
      take: limit,
      skip,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userId: true,
        postDescription: true,
        postImage: true,
        likes: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            userId: true,
            comment: true,
            likes: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
