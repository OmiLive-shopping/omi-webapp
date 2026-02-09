import { PostsRepository, PostData } from "../repositories/posts.repository.js";

export class PostsService {
  constructor(private postsRepository: PostsRepository) {}

  private map(post: PostData) {
    return {
      ...post,
      createdAt: post.createdAt.toISOString(),
      comments: post.comments.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async getAllPosts() {
    const posts = await this.postsRepository.getAllPosts();
    return { success: true, data: posts.map(this.map) };
  }

  async searchPosts(query: string) {
    const posts = await this.postsRepository.searchPosts(query);
    return { success: true, data: posts.map(this.map) };
  }

  async createPost(userId: string, postDescription: string, postImage?: string) {
    const post = await this.postsRepository.createPost(userId, postDescription, postImage);
    return { success: true, data: this.map(post) };
  }
}
