import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { authMiddleware } from '../../../middleware/auth-enhanced.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { ProductRepository } from '../../product/repositories/product.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { StreamController } from '../controllers/stream.controller';
import { StreamRepository } from '../repositories/stream.repository';
import {
  addStreamProductSchema,
  commentSchema,
  createStreamSchema,
  endStreamSchema,
  goLiveSchema,
  streamFiltersSchema,
  updateStreamSchema,
  updateViewerCountSchema,
  startStreamSchema,
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
router.get('/:id/comments', streamController.getStreamComments);
router.get('/:id/stats', streamController.getStreamStats);
router.get('/:id/viewers', streamController.getStreamViewers);

// Stream control routes (no auth required for stream key validation)
router.post('/end-stream', validateRequest(endStreamSchema), streamController.endStream);

// Protected routes (require authentication)
router.use(authMiddleware);

// Stream management
router.post('/', validateRequest(createStreamSchema), streamController.createStream);
router.put('/:id', validateRequest(updateStreamSchema), streamController.updateStream);
router.patch('/:id', validateRequest(updateStreamSchema), streamController.updateStream);
router.delete('/:id', streamController.deleteStream);

// Stream control - requires auth
router.post('/:id/go-live', streamController.goLive);
router.post('/start', validateRequest(startStreamSchema), streamController.startStream);
router.post('/:id/end', streamController.endStreamById);

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
