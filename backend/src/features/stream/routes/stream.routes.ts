import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config.js';
import { ROLES } from '../../../constants/roles.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requirePermission, requireRole } from '../../../middleware/role.middleware.js';
import { validateRequest } from '../../../middleware/validation.middleware.js';
import { ProductRepository } from '../../product/repositories/product.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { StreamController } from '../controllers/stream.controller.js';
import { StreamRepository } from '../repositories/stream.repository.js';
import {
  addStreamProductSchema,
  commentHistorySchema,
  commentSchema,
  createStreamSchema,
  endStreamSchema,
  goLiveSchema,
  startStreamSchema,
  streamFiltersSchema,
  updateStreamSchema,
  updateViewerCountSchema,
} from '../schemas/stream.schema.js';
import { StreamService } from '../services/stream.service.js';

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
router.use(authenticate);

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

// VDO.ninja configuration
router.get(
  '/:id/streaming-config',
  requirePermission('streams.update'),
  streamController.getStreamingConfig,
);
router.get('/:id/viewer-url', streamController.getViewerUrl);

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
