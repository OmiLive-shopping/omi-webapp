import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { ROLES } from '../../../constants/roles';
import { authMiddleware } from '../../../middleware/auth-enhanced.middleware';
import { requirePermission, requireRole } from '../../../middleware/role.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { ProductRepository } from '../../product/repositories/product.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { StreamController } from '../controllers/stream.controller';
import { StreamRepository } from '../repositories/stream.repository';
import {
  addStreamProductSchema,
  commentSchema,
  commentHistorySchema,
  createStreamSchema,
  endStreamSchema,
  goLiveSchema,
  startStreamSchema,
  streamFiltersSchema,
  updateStreamSchema,
  updateViewerCountSchema,
} from '../schemas/stream.schema';
import { StreamService } from '../services/stream.service';

const router = Router();

// Initialize dependencies
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;
const streamRepository = new StreamRepository(prisma);
const productRepository = new ProductRepository(prisma);
const userRepository = new UserRepository(prisma);
const streamService = new StreamService(streamRepository, productRepository, userRepository);
const streamController = new StreamController(streamService);

// Public routes
router.get('/', validateRequest(streamFiltersSchema, 'query'), streamController.getStreams);
router.get('/:id', streamController.getStreamById);
router.get('/:id/products', streamController.getStreamProducts);
router.get(
  '/:id/comments',
  validateRequest(commentHistorySchema, 'query'),
  streamController.getStreamComments,
);
router.get('/:id/stats', streamController.getStreamStats);
router.get('/:id/viewers', streamController.getStreamViewers);

// Stream control routes (no auth required for stream key validation)
router.post('/end-stream', validateRequest(endStreamSchema), streamController.endStream);

// Protected routes (require authentication)
router.use(authMiddleware);

// Stream management - requires streamer or admin role
router.post(
  '/',
  requireRole(ROLES.STREAMER, ROLES.ADMIN),
  validateRequest(createStreamSchema),
  streamController.createStream,
);
router.put(
  '/:id',
  requirePermission('streams.update'),
  validateRequest(updateStreamSchema),
  streamController.updateStream,
);
router.patch(
  '/:id',
  requirePermission('streams.update'),
  validateRequest(updateStreamSchema),
  streamController.updateStream,
);
router.delete('/:id', requirePermission('streams.delete'), streamController.deleteStream);

// Stream control - requires stream ownership or admin
router.post('/:id/go-live', requirePermission('streams.update'), streamController.goLive);
router.post(
  '/start',
  requirePermission('streams.create'),
  validateRequest(startStreamSchema),
  streamController.startStream,
);
router.post('/:id/end', requirePermission('streams.update'), streamController.endStreamById);

// Stream viewer count (could be used by stream software)
router.patch(
  '/:id/viewer-count',
  validateRequest(updateViewerCountSchema),
  streamController.updateViewerCount,
);

// Stream products
router.post(
  '/:id/products',
  validateRequest(addStreamProductSchema),
  streamController.addProductToStream,
);
router.delete('/:id/products/:productId', streamController.removeProductFromStream);

// Comments
router.post('/:id/comments', validateRequest(commentSchema), streamController.addComment);

export default router;
