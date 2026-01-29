// backend/src/features/posts/controllers/posts.controller.ts
import { Request, Response } from 'express';
import { PostsService } from '../services/posts.service.js';
import { User } from '@prisma/client';

/**
 * Authenticated request type (assumes auth middleware attaches `user`)
 */
type AuthenticatedRequest = Request & { user: User };

export class PostsController {
  constructor(private readonly service: PostsService) {}

  // Get all posts
  getPosts = async (req: Request, res: Response) => {
    try {
      const { limit, skip } = req.query;
      const posts = await this.service.getAllPosts(
        limit ? Number(limit) : undefined,
        skip ? Number(skip) : undefined
      );
      res.json(posts);
    } catch (err) {
      console.error('[GET POSTS ERROR]', err);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  };

  // Create a new post
  createPost = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        return res.status(401).json({ message: 'User not logged in' });
      }

      const { postDescription, postImage } = authReq.body;

      if (!postDescription || postDescription.trim() === '') {
        return res.status(400).json({ message: 'Post content cannot be empty' });
      }

      const post = await this.service.createPost(
        authReq.user.id,
        postDescription,
        postImage
      );

      res.status(201).json(post);
    } catch (err) {
      console.error('[CREATE POST ERROR]', err);
      res.status(500).json({ message: 'Failed to create post' });
    }
  };

  // Like a post
  likePost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.likePost(id);
      res.json(result);
    } catch (err) {
      console.error('[LIKE POST ERROR]', err);
      res.status(500).json({ message: 'Failed to like post' });
    }
  };

  // Search posts
  searchPosts = async (req: Request, res: Response) => {
    try {
      const query = req.query.q?.toString() || '';
      if (!query) {
        return res.status(400).json({ message: 'Query parameter q is required' });
      }

      const posts = await this.service.searchPosts(query);
      res.json(posts);
    } catch (err) {
      console.error('[SEARCH POSTS ERROR]', err);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  };
}
