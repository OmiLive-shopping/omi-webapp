import { PrismaClient } from '@prisma/client';

export interface CommentData {
  id: string;
  postId: string;
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
}

export class CommentsRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createComment(postId: string, userId: string, comment: string): Promise<CommentData> {
    return this.prisma.comment.create({
      data: { postId, userId, comment },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async likeComment(commentId: string): Promise<CommentData> {
    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { likes: { increment: 1 } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    return comment;
  }
}
