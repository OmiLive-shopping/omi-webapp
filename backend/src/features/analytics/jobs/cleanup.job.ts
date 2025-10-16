import { container } from 'tsyringe';

import { AnalyticsService } from '../services/analytics.service.js';

/**
 * Analytics cleanup job
 * Runs daily to clean up old analytics data based on retention policies
 */
export class AnalyticsCleanupJob {
  private intervalId: NodeJS.Timeout | null = null;
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = container.resolve(AnalyticsService);
  }

  /**
   * Start the cleanup job
   * @param intervalHours - How often to run the cleanup (default: 24 hours)
   */
  start(intervalHours: number = 24) {
    // Run immediately on start
    this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => this.runCleanup(), intervalHours * 60 * 60 * 1000);

    console.log(`Analytics cleanup job started - runs every ${intervalHours} hours`);
  }

  /**
   * Stop the cleanup job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Analytics cleanup job stopped');
    }
  }

  /**
   * Run the cleanup task
   */
  private async runCleanup() {
    try {
      console.log('Starting analytics cleanup...');
      const startTime = Date.now();

      await this.analyticsService.runCleanup();

      const duration = Date.now() - startTime;
      console.log(`Analytics cleanup completed in ${duration}ms`);
    } catch (error) {
      console.error('Analytics cleanup job failed:', error);
    }
  }
}

// Export singleton instance
export const analyticsCleanupJob = new AnalyticsCleanupJob();
