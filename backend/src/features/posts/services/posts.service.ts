import { PostsRepository } from '../repositories/posts.repository.js';

export class PostsService {
  constructor(private readonly postsRepo: PostsRepository) {}

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
  }

  // ---------------- Search Posts ----------------
  searchPosts(query: string) {
    if (!query || !query.trim()) return [];
    return this.postsRepo.getPostsBySearch(query.trim());
  }
}
