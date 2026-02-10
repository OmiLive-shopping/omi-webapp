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

// Search posts by query
const searchPostsQuerySchema = z.object({
  q: z.string().min(1, "Search query cannot be empty"), // <-- must match req.query.q
});

router.get(
  '/search',
  validationMiddleware(searchPostsQuerySchema, 'query'),
  postsController.searchPosts
);

// GET all posts
router.get('/', postsController.getPosts);

// CREATE post with validation
router.post(
  '/',
  authenticate,
  validationMiddleware(createPostSchema, 'body'),
  postsController.createPost
);

// LIKE post
router.patch('/:id/like', authenticate, postsController.likePost);

export default router;
