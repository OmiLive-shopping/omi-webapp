import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import {
  validateRequest,
  validationMiddleware,
} from '../../../middleware/validation.middleware.js';

import { PostsController } from '../controllers/posts.controller.js';
import { PostsRepository } from '../repositories/posts.repository.js';
import { PostsService } from '../services/posts.service.js';
// import { createPostSchema, updatePostSchema } from '../schemas/posts.schema.js'; // uncomment if implementing create/update

const router = Router();

/**
 * Dependency Injection
 */
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;

const postsRepository = new PostsRepository(prisma);
const postsService = new PostsService(postsRepository);
const postsController = new PostsController(postsService);

/**
 * Public routes
 */
// Get all posts
router.get('/', postsController.getPosts);

// Get posts by a specific user
router.get('/users/:userId', postsController.getPostsByUser);

/**
 * Protected routes (optional, uncomment when implementing create/update/delete)
 */
// Create a post
// router.post(
//   '/',
//   authenticate,
//   validationMiddleware(createPostSchema),
//   validateRequest,
//   postsController.createPost,
// );

// Update a post
// router.put(
//   '/:id',
//   authenticate,
//   validationMiddleware(updatePostSchema),
//   validateRequest,
//   postsController.updatePost,
// );

// Delete a post
// router.delete(
//   '/:id',
//   authenticate,
//   postsController.deletePost,
// );

export default router;
