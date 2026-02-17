import { PrismaClient } from '@prisma/client';

export interface PostData {
  id: string;
  userId: string;
  postDescription: string;
  postImage: string | null;
  likes: number;
  createdAt: Date;
  contentEmbedding?: number[]; // NEW: optional embedding
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
  constructor(private readonly prisma: PrismaClient) {}

  // ---------------- Get All Posts ----------------
  getAllPosts(limit?: number, skip?: number) {
    return this.prisma.post.findMany({
      take: limit ?? 10,
      skip: skip ?? 0,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        postDescription: true,
        postImage: true,
        likes: true,
        createdAt: true,
        contentEmbedding: true, // Include embedding for semantic search
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

  // ---------------- Create Post ----------------
  async createPost(
    userId: string,
    postDescription: string,
    postImage?: string | null
  ) {
    const post = await this.prisma.post.create({
      data: { userId, postDescription, postImage },
    });

    // Return post with all fields including relations
    const posts = await this.getAllPosts(1, 0);
    return posts[0];
  }

  // ---------------- Like Post ----------------
  likePost(postId: string) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });
  }

  // ---------------- Keyword Search ----------------
  getPostsBySearch(query: string) {
    return this.prisma.post.findMany({
      where: {
        postDescription: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        postDescription: true,
        postImage: true,
        likes: true,
        createdAt: true,
        contentEmbedding: true,
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true },
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
              select: { id: true, username: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  // ---------------- Save Embedding ----------------
  async savePostEmbedding(postId: string, embedding: number[]) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { contentEmbedding: embedding },
    });
  }

  // ---------------- Get Posts by IDs ----------------
  async getPostsByIds(ids: string[]) {
    return this.prisma.post.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        postDescription: true,
        postImage: true,
        likes: true,
        createdAt: true,
        contentEmbedding: true,
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            userId: true,
            comment: true,
            likes: true,
            createdAt: true,
            user: { select: { id: true, username: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }
}
