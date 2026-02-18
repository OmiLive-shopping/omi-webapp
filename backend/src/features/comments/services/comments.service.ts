// services/comments.service.ts
import { CommentsRepository } from '../repositories/comments.repository.js';

export class CommentsService {
  constructor(private readonly repo: CommentsRepository) {}

  createComment(userId: string, postId: string, comment: string) {
    return this.repo.createComment(userId, postId, comment);
  }

  likeComment(commentId: string) {
    if (!commentId) throw new Error("Comment ID is required");
    return this.repo.likeComment(commentId);
  }
}
