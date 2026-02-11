// src/modules/comments/controllers/comments.controller.ts
import { Request, Response } from 'express';
import { CommentsService } from '../services/comments.service.js';
import { User } from '@prisma/client';

type AuthenticatedRequest = Request & { user: User };

export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  createComment = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const authReq = req as AuthenticatedRequest;
    const { postId, comment } = authReq.body;

    try {
      const newComment = await this.service.createComment(authReq.user.id, postId, comment);
      res.status(201).json(newComment);
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to add comment' });
    }
  };

  likeComment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const result = await this.service.likeComment(id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to like comment' });
    }
  };
}
