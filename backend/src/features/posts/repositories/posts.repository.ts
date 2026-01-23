// repositories/posts.repository.ts
import { PrismaClient } from '@prisma/client';

export class PostsRepository {
  constructor(private prisma: PrismaClient) {}

  getAllPosts(limit?: number, skip?: number) {
    return this.prisma.post.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
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
          orderBy: { createdAt: 'asc' },
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

  createPost(userId: string, postDescription: string, postImage?: string | null) {
    return this.prisma.post.create({
      data: { userId, postDescription, postImage },
      include: { user: true, comments: true },
    });
  }

  likePost(postId: string) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });
  }
}
