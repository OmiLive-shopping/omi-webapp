import { Router } from 'express';
import { container } from 'tsyringe';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { rateLimiter } from '@/middleware/rate-limit.middleware';

const router = Router();
const analyticsController = container.resolve(AnalyticsController);

// Public routes (with rate limiting)
router.get(
  '/stream/:streamId',
  rateLimiter,
  analyticsController.getStreamAnalytics.bind(analyticsController)
);

router.get(
  '/stream/:streamId/performance',
  rateLimiter,
  analyticsController.getStreamPerformanceReport.bind(analyticsController)
);

// Protected routes
router.use(authMiddleware);

router.get(
  '/dashboard',
  rateLimiter,
  analyticsController.getDashboardAnalytics.bind(analyticsController)
);

router.post(
  '/realtime',
  rateLimiter,
  analyticsController.processRealtimeStats.bind(analyticsController)
);

router.post(
  '/viewer',
  rateLimiter,
  analyticsController.updateViewerAnalytics.bind(analyticsController)
);

// Admin only route
router.post(
  '/cleanup',
  rateLimiter,
  analyticsController.runCleanup.bind(analyticsController)
);

export default router;