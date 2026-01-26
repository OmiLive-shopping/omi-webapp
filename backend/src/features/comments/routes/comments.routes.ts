import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { PrismaService } from '../../../config/prisma.config.js';
import { CommentsRepository } from '../repositories/comments.repository.js';
import { CommentsService } from '../services/comments.service.js';
import { CommentsController } from '../controllers/comments.controller.js';
import { PostsRepository } from '../../posts/repositories/posts.repository.js';

const router = Router();

const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;

const commentsRepo = new CommentsRepository(prisma);
const postsRepo = new PostsRepository(prisma);

const commentsService = new CommentsService(commentsRepo, postsRepo);
const commentsController = new CommentsController(commentsService);

// CREATE comment
router.post('/', authenticate, commentsController.createComment);

// LIKE comment
router.patch('/:commentId/like', authenticate, commentsController.likeComment);

export default router;
