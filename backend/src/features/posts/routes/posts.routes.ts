import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { validationMiddleware } from '../../../middleware/validation.middleware.js';
import { PrismaService } from '../../../config/prisma.config.js';
import { PostsRepository } from '../repositories/posts.repository.js';
import { PostsService } from '../services/posts.service.js';
import { PostsController } from '../controllers/posts.controller.js';
import { createPostSchema } from '../schemas/posts.schema.js';
import { z } from 'zod';

const router = Router();

const prisma = PrismaService.getInstance().client;
const postsRepo = new PostsRepository(prisma);
const postsService = new PostsService(postsRepo);
const postsController = new PostsController(postsService);

// ---------------- Search Posts ----------------
const searchPostsQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty'),
});

router.get(
  '/search',
  validationMiddleware(searchPostsQuerySchema, 'query'),
  postsController.searchPosts
);

// ---------------- Get All Posts ----------------
router.get('/', postsController.getPosts);

// ---------------- Create Post ----------------
router.post(
  '/',
  authenticate,
  validationMiddleware(createPostSchema, 'body'),
  postsController.createPost
);

// ---------------- Like Post ----------------
router.patch('/:id/like', authenticate, postsController.likePost);

export default router;
