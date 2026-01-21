import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { PostsService } from '../services/posts.service.js';

// Type for authenticated requests (if you later add auth)
type AuthRequest = Request;

export class PostsController {
  private postsService: PostsService;

  constructor(postsService: PostsService) {
    this.postsService = postsService;
  }

  /**
   * Get all posts for community page
   * GET /v1/posts
   * Optional query params: limit, skip
   */
  getPosts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query params with zod
      const querySchema = z.object({
        limit: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : undefined)),
        skip: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : undefined)),
      });

      const { limit, skip } = querySchema.parse(req.query);

      const result = await this.postsService.getAllPosts(limit, skip);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Optionally: get posts by a specific user
   * GET /v1/posts/users/:userId
   */
  getPostsByUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { limit, skip } = req.query;

      const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
      const parsedSkip = skip ? parseInt(skip as string, 10) : undefined;

      const result = await this.postsService.getPostsByUser(userId, parsedLimit, parsedSkip);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
