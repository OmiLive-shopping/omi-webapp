import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AnalyticsService } from '../services/analytics.service';

@injectable()
export class AnalyticsController {
  constructor(
    @inject(AnalyticsService) private analyticsService: AnalyticsService
  ) {}

  /**
   * Get stream analytics
   * GET /api/v1/analytics/stream/:streamId
   */
  async getStreamAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { streamId } = req.params;
      const {
        intervalType,
        startDate,
        endDate,
        includeRealtime,
        includeQualityEvents,
        includeViewerStats
      } = req.query;

      const analytics = await this.analyticsService.getStreamAnalytics(streamId, {
        intervalType: intervalType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        includeRealtime: includeRealtime === 'true',
        includeQualityEvents: includeQualityEvents === 'true',
        includeViewerStats: includeViewerStats === 'true'
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stream performance report
   * GET /api/v1/analytics/stream/:streamId/performance
   */
  async getStreamPerformanceReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { streamId } = req.params;

      const report = await this.analyticsService.getStreamPerformanceReport(streamId);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard analytics
   * GET /api/v1/analytics/dashboard
   */
  async getDashboardAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user?.id;

      const dashboard = await this.analyticsService.getDashboardAnalytics(
        userId,
        startDate && endDate
          ? {
              start: new Date(startDate as string),
              end: new Date(endDate as string)
            }
          : undefined
      );

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process realtime stats (called by socket handler)
   * POST /api/v1/analytics/realtime
   */
  async processRealtimeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { streamId, stats } = req.body;

      if (!streamId || !stats) {
        res.status(400).json({
          success: false,
          message: 'Stream ID and stats are required'
        });
        return;
      }

      await this.analyticsService.processRealtimeStats(streamId, stats);

      res.json({
        success: true,
        message: 'Stats processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update viewer analytics
   * POST /api/v1/analytics/viewer
   */
  async updateViewerAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { streamId, sessionId, event, data } = req.body;

      if (!streamId || !sessionId || !event) {
        res.status(400).json({
          success: false,
          message: 'Stream ID, session ID, and event are required'
        });
        return;
      }

      await this.analyticsService.updateViewerAnalytics(
        streamId,
        sessionId,
        event,
        data
      );

      res.json({
        success: true,
        message: 'Viewer analytics updated'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run cleanup (should be called by a cron job)
   * POST /api/v1/analytics/cleanup
   */
  async runCleanup(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      await this.analyticsService.runCleanup();

      res.json({
        success: true,
        message: 'Analytics cleanup completed'
      });
    } catch (error) {
      next(error);
    }
  }
}