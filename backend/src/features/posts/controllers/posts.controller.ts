import { Request, Response, NextFunction } from "express";
import { PostsService } from "../services/posts.service.js";

// Define AuthUser inline
interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string | null;
  name?: string | null;
}

// Extend Request with AuthUser
interface AuthRequest extends Request {
  user?: AuthUser;
}

export class PostsController {
  constructor(private postsService: PostsService) {}

  // Get all posts
  getPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.postsService.getAllPosts();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // Search posts
  searchPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = String(req.query.q || "");
      const result = await this.postsService.searchPosts(query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // Create post (requires auth)
  createPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user)
        return res.status(401).json({ success: false, message: "Unauthorized" });

      const { postDescription, postImage } = req.body;
      const result = await this.postsService.createPost(
        req.user.id,
        postDescription,
        postImage || null
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };
}
