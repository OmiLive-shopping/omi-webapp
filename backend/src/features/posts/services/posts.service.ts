import { PostsRepository, PostData } from "../repositories/posts.repository.js";

export class PostsService {
  constructor(private postsRepository: PostsRepository) {}

<<<<<<< HEAD
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
=======
  // ---------------- Get All Posts ----------------
  getAllPosts(limit?: number, skip?: number) {
    return this.postsRepo.getAllPosts(limit, skip);
  }

  // ---------------- Create Post ----------------
  createPost(
    userId: string,
    postDescription: string,
    postImage?: string | null
  ) {
    return this.postsRepo.createPost(userId, postDescription, postImage);
  }

  // ---------------- Like Post ----------------
  likePost(postId: string) {
    if (!postId) throw new Error('Post ID is required');
    return this.postsRepo.likePost(postId);
>>>>>>> bd59855a4f3e51fafad02a80a430904d129c6dde
  }

  // ---------------- Search Posts ----------------
  searchPosts(query: string) {
    if (!query || !query.trim()) return [];
    return this.postsRepo.getPostsBySearch(query.trim());
  }
}
