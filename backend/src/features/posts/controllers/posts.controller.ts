// controllers/posts.controller.ts
import { Request, Response } from 'express';
import { PostsService } from '../services/posts.service.js';
import { User } from '@prisma/client';

type AuthenticatedRequest = Request & { user: User };

export class PostsController {
  constructor(private readonly service: PostsService) {}

  getPosts = async (req: Request, res: Response) => {
    const { limit, skip } = req.query;
    const posts = await this.service.getAllPosts(
      limit ? Number(limit) : undefined,
      skip ? Number(skip) : undefined
    );
    res.json(posts);
  };

  createPost = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const authReq = req as AuthenticatedRequest;
    const { postDescription, postImage } = authReq.body;
    const post = await this.service.createPost(authReq.user.id, postDescription, postImage);
    res.status(201).json(post);
  };

  likePost = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.service.likePost(id);
    res.json(result);
  };

  // ✅ New: search posts
  searchPosts = async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ message: 'Query parameter is required' });
    const posts = await this.service.searchPosts(query);
    res.json(posts);
  };
}
