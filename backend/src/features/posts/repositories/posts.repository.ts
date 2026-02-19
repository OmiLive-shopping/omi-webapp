import { PrismaClient, Prisma } from '@prisma/client';

export class PostsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------------- Get All Posts ----------------
  getAllPosts(limit?: number, skip?: number) {
    return this.prisma.post.findMany({
      take: limit ?? 10,
      skip: skip ?? 0,
      orderBy: { createdAt: 'desc' },
      select: this.postSelect(),
    });
  }

  // ---------------- Create Post ----------------
  async createPost(
    userId: string,
    postDescription: string,
    postImage?: string | null,
    contentEmbedding?: number[]
  ) {
    await this.prisma.post.create({
      data: {
        userId,
        postDescription,
        postImage,
        contentEmbedding: contentEmbedding ?? [],
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

  // ---------------- Keyword Search ----------------
  getPostsBySearch(query: string) {
    return this.prisma.post.findMany({
      where: {
        postDescription: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      select: this.postSelect(),
    });
  }

  // ---------------- Get All For Semantic ----------------
  getAllForSemantic() {
    return this.prisma.post.findMany({
      select: this.postSelect(true),
    });
  }

  // ---------------- Shared Select ----------------
  private postSelect(includeEmbedding = false): Prisma.PostSelect {
    return {
      id: true,
      userId: true,
      postDescription: true,
      postImage: true,
      likes: true,
      createdAt: true,
      ...(includeEmbedding && { contentEmbedding: true }),
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
          createdAt: 'asc', // ✅ Now properly typed
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
    };
  }
}
