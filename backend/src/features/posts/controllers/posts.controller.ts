import { Request, Response } from 'express';
import { PostsService } from '../services/posts.service.js';
import { User } from '@prisma/client';

type AuthenticatedRequest = Request & { user: User };

export class PostsController {
  constructor(private readonly service: PostsService) {}

  // ---------------- Get All Posts ----------------
  getPosts = async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const skip = Number(req.query.skip) || 0;

      const posts = await this.service.getAllPosts(limit, skip);

      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  };

  // ---------------- Create Post ----------------
  createPost = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const { postDescription, postImage } = req.body;

      const post = await this.service.createPost(
        req.user.id,
        postDescription,
        postImage
      );

      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create post' });
    }
  };

  // ---------------- Like Post ----------------
  likePost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const updated = await this.service.likePost(id);

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Failed to like post' });
    }
  };

  // ---------------- Search Posts ----------------
  searchPosts = async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string)?.trim();
      const mode =
        (req.query.mode as string) || 'keyword';

      if (!query) {
        return res
          .status(400)
          .json({ message: 'Query required' });
      }

      let posts;

      if (mode === 'semantic') {
        posts =
          await this.service.semanticSearchPosts(
            query
          );
      } else {
        posts =
          await this.service.searchPosts(query);
      }

      res.json(posts);
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Failed to search posts' });
    }
  };
}
