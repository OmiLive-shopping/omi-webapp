// src/modules/comments/routes/comments.route.ts
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { validationMiddleware } from '../../../middleware/validation.middleware.js';
import { PrismaService } from '../../../config/prisma.config.js';
import { CommentsRepository } from '../repositories/comments.repository.js';
import { CommentsService } from '../services/comments.service.js';
import { CommentsController } from '../controllers/comments.controller.js';
import { createCommentSchema } from '../schemas/comments.schema.js';

const router = Router();

const prisma = PrismaService.getInstance().client;
const commentsRepo = new CommentsRepository(prisma);
const commentsService = new CommentsService(commentsRepo);
const commentsController = new CommentsController(commentsService);

// CREATE comment
router.post(
  '/',
  authenticate,
  validationMiddleware(createCommentSchema, 'body'),
  commentsController.createComment
);

// LIKE comment
router.patch('/:id/like', authenticate, commentsController.likeComment);

export default router;
