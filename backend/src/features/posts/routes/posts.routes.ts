import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { PrismaService } from '../../../config/prisma.config.js';
import { PostsRepository } from '../repositories/posts.repository.js';
import { PostsService } from '../services/posts.service.js';
import { PostsController } from '../controllers/posts.controller.js';

const router = Router();

const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;

const postsRepo = new PostsRepository(prisma);
const postsService = new PostsService(postsRepo);
const postsController = new PostsController(postsService);

// GET all posts - disable caching
router.get('/', (req, res, next) => {
  res.set('Cache-Control', 'no-store'); // Force fresh data
  next();
}, postsController.getPosts);

// CREATE post
router.post('/', authenticate, postsController.createPost);

// LIKE post
router.patch('/:id/like', authenticate, postsController.likePost);

export default router;
