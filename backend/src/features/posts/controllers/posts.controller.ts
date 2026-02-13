import { Request, Response } from 'express';
import { PostsService } from '../services/posts.service.js';
import { User } from '@prisma/client';

type AuthenticatedRequest = Request & { user: User };

export class PostsController {
  constructor(private readonly service: PostsService) {}

  // ---------------- Get Posts (Pagination Safe) ----------------
  getPosts = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const skip = req.query.skip ? Number(req.query.skip) : 0;

      if (isNaN(limit) || isNaN(skip)) {
        return res.status(400).json({
          message: 'Invalid pagination parameters',
        });
      }

      const posts = await this.service.getAllPosts(limit, skip);
      res.json(posts);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch posts',
      });
    }
  };

  // ---------------- Create Post ----------------
  createPost = async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const authReq = req as AuthenticatedRequest;
    const { postDescription, postImage } = authReq.body;

    try {
      const post = await this.service.createPost(
        authReq.user.id,
        postDescription,
        postImage
      );

      res.status(201).json(post);
    } catch (err: any) {
      res.status(400).json({
        message: err.message || 'Failed to add post',
      });
    }
  };

  // ---------------- Like Post ----------------
  likePost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: 'Post ID is required' });
      }

      const result = await this.service.likePost(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to like post',
      });
    }
  };

  // ---------------- Search Posts ----------------
  searchPosts = async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;

      if (!query || !query.trim()) {
        return res
          .status(400)
          .json({ message: 'Query parameter is required' });
      }

      const posts = await this.service.searchPosts(query.trim());
      res.json(posts);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to search posts',
      });
    }
  };
}
