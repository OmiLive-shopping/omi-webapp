import { PostsRepository } from '../repositories/posts.repository.js';

export class PostsService {
  constructor(private readonly postsRepo: PostsRepository) {}

  getAllPosts(limit?: number, skip?: number) {
    return this.postsRepo.getAllPosts(limit, skip);
  }

  createPost(userId: string, postDescription: string, postImage?: string | null) {
    return this.postsRepo.createPost(userId, postDescription, postImage);
  }

  likePost(postId: string) {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    return this.postsRepo.likePost(postId);
  }
}
