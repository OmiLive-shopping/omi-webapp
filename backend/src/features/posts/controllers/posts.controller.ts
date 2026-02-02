import { Request, Response, NextFunction } from 'express';
import { PostsService } from '../services/posts.service.js';

export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  getPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const skip = parseInt(req.query.skip as string) || 0;

      const posts = await this.postsService.getAllPosts(limit, skip);

      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  };

  createPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postDescription, postImage } = req.body;
      const userId = req.user!.id;

      const post = await this.postsService.createPost(userId, postDescription, postImage);

      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  };

  likePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const updated = await this.postsService.likePost(id);

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };
}
