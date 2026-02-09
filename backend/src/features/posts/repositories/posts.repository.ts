import { PrismaClient, Prisma } from "@prisma/client";

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
  comments: {
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
  constructor(private prisma: PrismaClient) {}

  async getAllPosts(): Promise<PostData[]> {
    return this.prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, username: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async searchPosts(query: string): Promise<PostData[]> {
    return this.prisma.post.findMany({
      where: { postDescription: { contains: query, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, username: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async createPost(userId: string, postDescription: string, postImage?: string) {
    return this.prisma.post.create({
      data: { userId, postDescription, postImage: postImage || null },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, username: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }
}
