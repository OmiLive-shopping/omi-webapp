import { PrismaClient } from '@prisma/client';

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
    await this.prisma.post.create({
      data: {
        userId,
        postDescription,
        postImage,
      },
    });

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

  // ---------------- Search Posts ----------------
  getPostsBySearch(query: string) {
    return this.prisma.post.findMany({
      where: {
        postDescription: {
          contains: query,
          mode: 'insensitive',
        },
      },
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

  // ---------------- Get Post By ID ----------------
  getPostById(postId: string) {
    return this.prisma.post.findUnique({
      where: { id: postId },
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
}
