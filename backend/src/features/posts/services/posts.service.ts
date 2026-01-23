// services/posts.service.ts
export class PostsService {
  constructor(private repo: any) {}

  map(post: any) {
    return {
      ...post,
      createdAt: post.createdAt.toISOString(),
      comments: post.comments.map((c: any) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async getAllPosts(limit?: number, skip?: number) {
    const posts = await this.repo.getAllPosts(limit, skip);
    return { success: true, data: posts.map(this.map) };
  }

  async createPost(userId: string, postDescription: string, postImage?: string) {
    const post = await this.repo.createPost(userId, postDescription, postImage);
    return { success: true, data: this.map({ ...post, comments: [] }) };
  }

  async likePost(postId: string) {
    const result = await this.repo.likePost(postId);
    return { success: true, data: result };
  }
}
