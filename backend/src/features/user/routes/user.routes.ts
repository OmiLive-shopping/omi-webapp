import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { auth } from '../../../middleware/auth.middleware';
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
router.post('/register', validateRequest(registerSchema), userController.register);
router.post('/login', validateRequest(loginSchema), userController.login);

// Protected routes - require authentication
router.get('/profile', auth, userController.getProfile);
router.patch('/profile', auth, validateRequest(updateProfileSchema), userController.updateProfile);

// Public routes with optional auth for follow status
router.get('/:id', userController.getPublicProfile);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

// Follow/Unfollow routes - require authentication
router.post('/:id/follow', auth, userController.followUser);
router.delete('/:id/follow', auth, userController.unfollowUser);

export default router;
