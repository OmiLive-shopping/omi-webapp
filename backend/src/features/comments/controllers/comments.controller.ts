// src/features/comments/controllers/comments.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CommentsService } from '../services/comments.service.js';

export class CommentsController {
  private readonly commentsService: CommentsService;

  constructor(commentsService: CommentsService) {
    this.commentsService = commentsService;
  }

  createComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { postId, comment } = req.body;
      const userId = req.user!.id; // authenticate middleware guarantees this

      const createdComment =
        await this.commentsService.createComment(postId, userId, comment);

      // ✅ return ONLY the created comment
      res.status(201).json(createdComment);
    } catch (error) {
      next(error);
    }
  };

  likeComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { commentId } = req.params;

      const updatedComment =
        await this.commentsService.likeComment(commentId);

      res.status(200).json(updatedComment);
    } catch (error) {
      next(error);
    }
  };
}
