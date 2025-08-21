import { Router } from 'express';
import { container } from 'tsyringe';

import { authMiddleware } from '@/middleware/auth.middleware';
import { apiRateLimiter } from '@/middleware/rate-limit.middleware';

import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = container.resolve(AnalyticsController);

// Public routes (with rate limiting)
router.get(
  '/stream/:streamId',
  apiRateLimiter,
  analyticsController.getStreamAnalytics.bind(analyticsController),
);

router.get(
  '/stream/:streamId/performance',
  apiRateLimiter,
  analyticsController.getStreamPerformanceReport.bind(analyticsController),
);

// Protected routes
router.use(authMiddleware);

router.get(
  '/dashboard',
  apiRateLimiter,
  analyticsController.getDashboardAnalytics.bind(analyticsController),
);

router.post(
  '/realtime',
  apiRateLimiter,
  analyticsController.processRealtimeStats.bind(analyticsController),
);

router.post(
  '/viewer',
  apiRateLimiter,
  analyticsController.updateViewerAnalytics.bind(analyticsController),
);

// Admin only route
router.post('/cleanup', apiRateLimiter, analyticsController.runCleanup.bind(analyticsController));

export default router;
