// repositories/comments.repository.ts
import { PrismaClient } from '@prisma/client';

export class CommentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createComment(userId: string, postId: string, comment: string) {
    return this.prisma.comment.create({
      data: { userId, postId, comment },
      include: { user: { select: { id: true, username: true, name: true, avatarUrl: true } } },
    });
  }

  async likeComment(commentId: string) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { likes: { increment: 1 } },
      include: { user: { select: { id: true, username: true, name: true, avatarUrl: true } } },
    });
  }
}
