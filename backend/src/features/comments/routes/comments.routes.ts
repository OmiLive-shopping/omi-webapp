import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { validationMiddleware } from '../../../middleware/validation.middleware.js';
import { PrismaService } from '../../../config/prisma.config.js';
import { CommentsRepository } from '../repositories/comments.repository.js';
import { CommentsService } from '../services/comments.service.js';
import { CommentsController } from '../controllers/comments.controller.js';
import { PostsRepository } from '../../posts/repositories/posts.repository.js';
import {
  createCommentBodySchema,
  likeCommentBodySchema,
  likeCommentParamsSchema,
} from '../schemas/comments.schema.js';

const router = Router();

const prisma = PrismaService.getInstance().client;

const commentsRepo = new CommentsRepository(prisma);
const postsRepo = new PostsRepository(prisma);

const commentsService = new CommentsService(commentsRepo, postsRepo);
const commentsController = new CommentsController(commentsService);

// CREATE comment
router.post(
  '/',
  authenticate,
  validationMiddleware(createCommentBodySchema, 'body'),
  commentsController.createComment
);

// LIKE comment
router.patch(
  '/:commentId/like',
  authenticate,
  validationMiddleware(likeCommentParamsSchema, 'params'),
  validationMiddleware(likeCommentBodySchema, 'body'),
  commentsController.likeComment
);

export default router;
