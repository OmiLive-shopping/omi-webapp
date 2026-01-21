import { PostsRepository, PostData } from '../repositories/posts.repository.js';

export class PostsService {
  private postsRepository: PostsRepository;

  constructor(postsRepository: PostsRepository) {
    this.postsRepository = postsRepository; // assign the instance correctly
  }

  /**
   * Get all posts for community page
   */
  async getAllPosts(limit?: number, skip?: number): Promise<{
    success: boolean;
    data?: PostData[];
    message?: string;
  }> {
    try {
      const posts = await this.postsRepository.getAllPosts(limit, skip);

      if (!posts || posts.length === 0) {
        return {
          success: false,
          message: 'No posts found',
        };
      }

      // Optionally, here you could filter content based on privacy or blocked users

      return {
        success: true,
        data: posts,
      };
    } catch (error) {
      console.error('Error fetching posts:', error);
      return {
        success: false,
        message: 'Failed to fetch posts',
      };
    }
  }

  /**
   * Optionally: get posts for a specific user
   */
  async getPostsByUser(
    userId: string,
    limit?: number,
    skip?: number,
  ): Promise<{
    success: boolean;
    data?: PostData[];
    message?: string;
  }> {
    try {
      const posts = await this.postsRepository.getPostsByUser(userId, limit, skip);

      if (!posts || posts.length === 0) {
        return {
          success: false,
          message: 'No posts found for this user',
        };
      }

      return {
        success: true,
        data: posts,
      };
    } catch (error) {
      console.error(`Error fetching posts for user ${userId}:`, error);
      return {
        success: false,
        message: 'Failed to fetch posts for this user',
      };
    }
  }
}
