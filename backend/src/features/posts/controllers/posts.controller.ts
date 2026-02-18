import { Request, Response } from 'express';
import { PostsService } from '../services/posts.service.js';
import { User } from '@prisma/client';

type AuthenticatedRequest = Request & { user: User };

export class PostsController {
  constructor(private readonly service: PostsService) {}

  // ---------------- Search Posts ----------------
  searchPosts = async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string)?.trim();
      const mode = (req.query.mode as string) || 'keyword'; // NEW: optional mode param

      if (!query) return res.status(400).json({ message: 'Query required' });

      let posts;
      if (mode === 'semantic') {
        posts = await this.service.semanticSearchPosts(query);
      } else {
        posts = await this.service.searchPosts(query);
      }

      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to search posts' });
    }
  };

  // Existing methods: getPosts, createPost, likePost (unchanged)
}
