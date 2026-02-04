import { PrismaClient } from "@prisma/client";

export class PostsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getAllPosts(limit: number = 5, skip: number = 0) {
    return this.prisma.post.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        postDescription: true,
        createdAt: true,
        userId: true,
        likes: true,
        postImage: true,
        user: { select: { id: true, username: true, name: true, avatarUrl: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            userId: true,
            comment: true,
            likes: true,
            createdAt: true,
            user: { select: { id: true, username: true, name: true, avatarUrl: true } }
          }
        }
      }
    });
  }

  async createPost(userId: string, postDescription: string, postImage?: string | null) {
    return this.prisma.post.create({
      data: { userId, postDescription, postImage },
      select: {
        id: true,
        postDescription: true,
        createdAt: true,
        userId: true,
        likes: true,
        postImage: true,
        user: { select: { id: true, username: true, name: true, avatarUrl: true } },
        comments: true
      }
    });
  }

  likePost(postId: string) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
      select: { likes: true }
    });
  }

  async getPostsByIds(ids: string[]) {
    return this.prisma.post.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        postDescription: true,
        createdAt: true,
        userId: true,
        likes: true,
        postImage: true,
        user: { select: { id: true, username: true, name: true, avatarUrl: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            userId: true,
            comment: true,
            likes: true,
            createdAt: true,
            user: { select: { id: true, username: true, name: true, avatarUrl: true } }
          }
        }
      }
    });
  }
}
