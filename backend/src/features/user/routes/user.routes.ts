import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import {
  commonValidations,
  handleValidationErrors,
  userValidations,
} from '../../../middleware/input-validation.middleware.js';
import { validateRequest } from '../../../middleware/validation.middleware.js';
import { UserController } from '../controllers/user.controller.js';
import { UserRepository } from '../repositories/user.repository.js';
import { updateProfileSchema } from '../schemas/user.schema.js';
import { UserService } from '../services/user.service.js';

// Dependency Injection
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client; // Get the PrismaClient instance
const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

const router = Router();

router.get('/', userController.heartbeat);

// Auth routes removed - now handled by Better Auth at /v1/auth/*

// Protected routes - require authentication
router.get('/profile', authenticate, userController.getProfile);
router.patch(
  '/profile',
  authenticate,
  userValidations.updateProfile,
  handleValidationErrors,
  validateRequest(updateProfileSchema),
  userController.updateProfile,
);

// Stream key management - require authentication
router.get('/stream-key', authenticate, userController.getStreamKey);
router.post('/stream-key/regenerate', authenticate, userController.regenerateStreamKey);

// Public routes with optional auth for follow status
router.get(
  '/:id',
  commonValidations.uuid('id'),
  handleValidationErrors,
  userController.getPublicProfile,
);

router.get(
  '/:id/followers',
  commonValidations.uuid('id'),
  ...commonValidations.pagination,
  handleValidationErrors,
  userController.getFollowers,
);

router.get(
  '/:id/following',
  commonValidations.uuid('id'),
  ...commonValidations.pagination,
  handleValidationErrors,
  userController.getFollowing,
);

// Follow/Unfollow routes - require authentication
router.post(
  '/:id/follow',
  authenticate,
  commonValidations.uuid('id'),
  handleValidationErrors,
  userController.followUser,
);

router.delete(
  '/:id/follow',
  authenticate,
  commonValidations.uuid('id'),
  handleValidationErrors,
  userController.unfollowUser,
);

export default router;
