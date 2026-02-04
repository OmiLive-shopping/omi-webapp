// backend/src/features/posts/routes/posts.routes.ts
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { PrismaService } from '../../../config/prisma.config.js';
import { PostsRepository } from '../repositories/posts.repository.js';
import { PostsService } from '../services/posts.service.js';
import { PostsController } from '../controllers/posts.controller.js';

const router = Router();

// Initialize Prisma + repository + service + controller
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;
const postsRepo = new PostsRepository(prisma);
const postsService = new PostsService(postsRepo);
const postsController = new PostsController(postsService);

// GET all posts
router.get('/', postsController.getPosts);

// CREATE post
router.post('/', authenticate, postsController.createPost);

// LIKE post
router.patch('/:id/like', authenticate, postsController.likePost);

// SEARCH posts
router.get('/search', postsController.searchPosts);

export default router;
