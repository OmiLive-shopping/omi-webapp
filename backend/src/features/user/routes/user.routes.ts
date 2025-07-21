import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { auth } from '../../../middleware/auth.middleware';
import {
  commonValidations,
  handleValidationErrors,
  userValidations,
} from '../../../middleware/input-validation.middleware';
import { authRateLimiter, searchRateLimiter } from '../../../middleware/rate-limit.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { UserController } from '../controllers/user.controller';
import { UserRepository } from '../repositories/user.repository';
import { loginSchema, registerSchema, updateProfileSchema } from '../schemas/user.schema';
import { UserService } from '../services/user.service';

// Dependency Injection
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client; // Get the PrismaClient instance
const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

const router = Router();

router.get('/', userController.heartbeat);

// Auth routes with rate limiting
router.post(
  '/register',
  authRateLimiter,
  userValidations.register,
  handleValidationErrors,
  validateRequest(registerSchema),
  userController.register,
);

router.post(
  '/login',
  authRateLimiter,
  userValidations.login,
  handleValidationErrors,
  validateRequest(loginSchema),
  userController.login,
);

// Protected routes - require authentication
router.get('/profile', auth, userController.getProfile);
router.patch(
  '/profile',
  auth,
  userValidations.updateProfile,
  handleValidationErrors,
  validateRequest(updateProfileSchema),
  userController.updateProfile,
);

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
  auth,
  commonValidations.uuid('id'),
  handleValidationErrors,
  userController.followUser,
);

router.delete(
  '/:id/follow',
  auth,
  commonValidations.uuid('id'),
  handleValidationErrors,
  userController.unfollowUser,
);

export default router;
