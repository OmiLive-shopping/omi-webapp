import { PostsRepository, PostData } from '../repositories/posts.repository.js';

interface CommunityPost {
  id: string;
  userId: string;
  postDescription: string;
  postImage: string | null;
  likes: number;
  createdAt: string;
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
    createdAt: string;
    user: {
      id: string;
      username: string;
      name: string | null;
      avatarUrl: string | null;
    };
  }[];
}

export class PostsService {
  private postsRepository: PostsRepository;

  constructor(postsRepository: PostsRepository) {
    this.postsRepository = postsRepository;
  }

  /**
   * Convert repository PostData → API-safe JSON
   */
  private mapPostToResponse(post: PostData): CommunityPost {
    return {
      id: post.id,
      userId: post.userId,
      postDescription: post.postDescription,
      postImage: post.postImage,
      likes: post.likes,
      createdAt: post.createdAt.toISOString(),
      user: post.user,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        userId: comment.userId,
        comment: comment.comment,
        likes: comment.likes,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      })),
    };
  }

  /**
   * Get all posts for community page
   */
  async getAllPosts(
    limit?: number,
    skip?: number,
  ): Promise<{
    success: boolean;
    data?: CommunityPost[];
    message?: string;
  }> {
    try {
      const posts = await this.postsRepository.getAllPosts(limit, skip);

      if (!posts || posts.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      return {
        success: true,
        data: posts.map(this.mapPostToResponse),
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
   * Get posts for a specific user
   */
  async getPostsByUser(
    userId: string,
    limit?: number,
    skip?: number,
  ): Promise<{
    success: boolean;
    data?: CommunityPost[];
    message?: string;
  }> {
    try {
      const posts = await this.postsRepository.getPostsByUser(userId, limit, skip);

      if (!posts || posts.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      return {
        success: true,
        data: posts.map(this.mapPostToResponse),
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
