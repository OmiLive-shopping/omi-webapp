import { CommentsRepository } from '../repositories/comments.repository.js';
import { PostsRepository, PostData } from '../../posts/repositories/posts.repository.js';

export class CommentsService {
  private commentsRepo: CommentsRepository;
  private postsRepo: PostsRepository;

  constructor(commentsRepo: CommentsRepository, postsRepo: PostsRepository) {
    this.commentsRepo = commentsRepo;
    this.postsRepo = postsRepo;
  }

  async createComment(postId: string, userId: string, comment: string): Promise<PostData> {
    await this.commentsRepo.createComment(postId, userId, comment);
    const post = await this.postsRepo.getPostsById(postId);
    return post!;
  }

  async likeComment(commentId: string, postId: string): Promise<PostData> {
    await this.commentsRepo.likeComment(commentId);
    const post = await this.postsRepo.getPostsById(postId);
    return post!;
  }
}
