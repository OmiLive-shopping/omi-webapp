import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import {
  validateRequest,
  validationMiddleware,
} from '../../../middleware/validation.middleware.js';
import { ProfileController } from '../controllers/profile.controller.js';
import { ProfileRepository } from '../repositories/profile.repository.js';
import {
  brandSlugParamSchema,
  createBrandProfileSchema,
  updateBrandProfileSchema,
  updateUserProfileSchema,
  usernameParamSchema,
} from '../schemas/profile.schema.js';
import { ProfileService } from '../services/profile.service.js';

// Dependency Injection
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client; // Get the PrismaClient instance
const profileRepository = new ProfileRepository(prisma);
const profileService = new ProfileService(profileRepository);
const profileController = new ProfileController(profileService);

const router = Router();

// Public routes - no authentication required

// Get user profile by username
router.get(
  '/users/:username',
  validationMiddleware(usernameParamSchema, 'params'),
  profileController.getUserProfile,
);

// Get brand profile by slug
router.get(
  '/brands/:slug',
  validationMiddleware(brandSlugParamSchema, 'params'),
  profileController.getBrandProfile,
);

// Check username availability
router.get(
  '/check-username/:username',
  validationMiddleware(usernameParamSchema, 'params'),
  profileController.checkUsernameAvailability,
);

// Check brand slug availability
router.get(
  '/check-brand-slug/:slug',
  validationMiddleware(brandSlugParamSchema, 'params'),
  profileController.checkBrandSlugAvailability,
);

// Protected routes - authentication required

// Create brand profile (admin only - permission check in controller)
router.post(
  '/brands',
  authenticate,
  validateRequest(createBrandProfileSchema),
  profileController.createBrandProfile,
);

// Update current user's profile
router.patch(
  '/me',
  authenticate,
  validateRequest(updateUserProfileSchema),
  profileController.updateMyProfile,
);

// Update current user's brand profile
router.patch(
  '/my-brand',
  authenticate,
  validateRequest(updateBrandProfileSchema),
  profileController.updateMyBrandProfile,
);

// Update user role (admin only)
router.patch('/users/role', authenticate, profileController.updateUserRole);

export default router;
