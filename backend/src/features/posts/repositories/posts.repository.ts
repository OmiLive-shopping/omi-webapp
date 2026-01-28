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

  async createPost(userId: string, postDescription: string, postImage?: string | null) {
    await this.prisma.post.create({
      data: { userId, postDescription, postImage },
    });

    // return normalized post list item
    return this.getAllPosts(1, 0).then(posts => posts[0]);
  }

  likePost(postId: string) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });
  }

  async getPostsByIds(postIds: string[]) {
  const posts = await this.prisma.post.findMany({
    where: {
      id: { in: postIds },
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

  // Preserve semantic ranking
  return postIds.map(id => posts.find(p => p.id === id)).filter(Boolean);
}

}

