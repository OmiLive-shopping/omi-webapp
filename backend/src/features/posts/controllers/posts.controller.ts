import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { PostsService } from '../services/posts.service.js';

// Type for authenticated requests (extend later if needed)
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
  getPosts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Validate and parse query params
      const querySchema = z.object({
        limit: z
          .string()
          .optional()
          .transform((val) => (val ? Number(val) : undefined))
          .refine((val) => val === undefined || !isNaN(val), {
            message: 'limit must be a number',
          }),
        skip: z
          .string()
          .optional()
          .transform((val) => (val ? Number(val) : undefined))
          .refine((val) => val === undefined || !isNaN(val), {
            message: 'skip must be a number',
          }),
      });

      const { limit, skip } = querySchema.parse(req.query);

      const result = await this.postsService.getAllPosts(limit, skip);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get posts by a specific user
   * GET /v1/posts/users/:userId
   */
  getPostsByUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const paramsSchema = z.object({
        userId: z.string().uuid(),
      });

      const querySchema = z.object({
        limit: z
          .string()
          .optional()
          .transform((val) => (val ? Number(val) : undefined)),
        skip: z
          .string()
          .optional()
          .transform((val) => (val ? Number(val) : undefined)),
      });

      const { userId } = paramsSchema.parse(req.params);
      const { limit, skip } = querySchema.parse(req.query);

      const result = await this.postsService.getPostsByUser(userId, limit, skip);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
