import { PrismaClient, Prisma, Post, Comment } from '@prisma/client';

export interface PostData {
  id: string;
  userId: string;
  postDescription: string;
  postImage: string | null;
  likes: number;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  comments?: {
    id: string;
    userId: string;
    comment: string;
    likes: number;
    createdAt: Date;
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
   * @param limit Optional number of posts to return (for pagination)
   * @param skip Optional number of posts to skip (for pagination)
   */
  async getAllPosts(limit?: number, skip?: number): Promise<PostData[]> {
    const posts = await this.prisma.post.findMany({
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
          select: {
            id: true,
            userId: true,
            comment: true, // ✅ matches schema
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

    return posts;
  }

  /**
   * Optionally: fetch posts by a single user
   */
  async getPostsByUser(userId: string, limit?: number, skip?: number): Promise<PostData[]> {
    const posts = await this.prisma.post.findMany({
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
          select: {
            id: true,
            userId: true,
            comment: true, // ✅ matches schema
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

    return posts;
  }
}
