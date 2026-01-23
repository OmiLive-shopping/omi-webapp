import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../../middleware/auth.middleware.js';

import { PrismaService } from '../../../config/prisma.config.js';
import { CommentsRepository } from '../repositories/comments.repository.js';
import { CommentsService } from '../services/comments.service.js';
import { CommentsController } from '../controllers/comments.controller.js';

const router = Router();

/** Dependency Injection */
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;

const commentsRepository = new CommentsRepository(prisma);
const commentsService = new CommentsService(commentsRepository);
const commentsController = new CommentsController(commentsService);

/** Routes */
// Create a comment
router.post('/', authenticate, commentsController.createComment);

// Like a comment
router.patch('/:commentId/like', authenticate, commentsController.likeComment);

export default router;
