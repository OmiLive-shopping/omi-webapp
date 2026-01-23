import { Request, Response, NextFunction } from 'express';
import { CommentsService } from '../services/comments.service.js';

export class CommentsController {
  private commentsService: CommentsService;

  constructor(commentsService: CommentsService) {
    this.commentsService = commentsService;
  }

  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId, comment } = req.body;
      const userId = req.user!.id; // assuming authenticate middleware sets req.user

      const updatedPost = await this.commentsService.createComment(postId, userId, comment);

      res.status(201).json({ success: true, data: updatedPost });
    } catch (error) {
      next(error);
    }
  };

  likeComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;
      const { postId } = req.body; // frontend should send postId

      const updatedPost = await this.commentsService.likeComment(commentId, postId);

      res.status(200).json({ success: true, data: updatedPost });
    } catch (error) {
      next(error);
    }
  };
}

