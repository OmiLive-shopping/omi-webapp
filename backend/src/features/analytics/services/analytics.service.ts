import { Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';

import type { VdoStreamStats } from '../../../socket/types/vdo-events.types.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';

interface IntervalConfig {
  type: string;
  duration: number; // in milliseconds
  retention: number; // retention period in days
}

@injectable()
export class AnalyticsService {
  private intervalConfigs: IntervalConfig[] = [
    { type: 'minute', duration: 60 * 1000, retention: 7 },
    { type: '5minutes', duration: 5 * 60 * 1000, retention: 30 },
    { type: '15minutes', duration: 15 * 60 * 1000, retention: 90 },
    { type: 'hour', duration: 60 * 60 * 1000, retention: 365 },
    { type: 'day', duration: 24 * 60 * 60 * 1000, retention: 730 },
  ];

  constructor(@inject(AnalyticsRepository) private analyticsRepo: AnalyticsRepository) {}

  /**
   * Process and store real-time stats from VDO.Ninja
   */
  async processRealtimeStats(streamId: string, stats: VdoStreamStats) {
    try {
      // Store real-time stats snapshot
      await this.analyticsRepo.createRealtimeStats({
        stream: { connect: { id: streamId } },
        viewerCount: stats.viewerCount || 0,
        fps: stats.fps?.current || 0,
        resolution: stats.resolution
          ? `${stats.resolution.width}x${stats.resolution.height}`
          : null,
        bitrate: stats.bitrate || 0,
        audioLevel: stats.audioLevel || 0,
        audioDropouts: stats.audioDropouts || 0,
        latency: stats.latency || 0,
        packetLoss: stats.packetLoss || 0,
        jitter: stats.jitter || 0,
        uploadSpeed: stats.uploadSpeed || 0,
        downloadSpeed: stats.downloadSpeed || 0,
        connectionState: this.mapConnectionState(stats),
        connectionQuality: stats.connectionQuality || 'good',
        isAudioMuted: stats.isAudioMuted || false,
        isVideoHidden: stats.isVideoHidden || false,
        isScreenSharing: stats.isScreenSharing || false,
        isRecording: stats.isRecording || false,
      });

      // Check for quality events
      await this.detectQualityEvents(streamId, stats);

      // Update aggregated analytics for different intervals
      await this.updateAggregatedAnalytics(streamId, stats);
    } catch (error) {
      console.error('Error processing realtime stats:', error);
      throw error;
    }
  }

  /**
   * Update viewer analytics when a viewer joins or leaves
   */
  async updateViewerAnalytics(
    streamId: string,
    sessionId: string,
    event: 'join' | 'leave' | 'update',
    data?: {
      userId?: string;
      deviceInfo?: {
        deviceType?: string;
        browser?: string;
        os?: string;
      };
      location?: string;
      metrics?: {
        latency?: number;
        packetLoss?: number;
        bufferingTime?: number;
      };
    },
  ) {
    try {
      if (event === 'join') {
        await this.analyticsRepo.createViewerAnalytics({
          stream: { connect: { id: streamId } },
          sessionId,
          ...(data?.userId && { user: { connect: { id: data.userId } } }),
          joinedAt: new Date(),
          deviceType: data?.deviceInfo?.deviceType,
          browser: data?.deviceInfo?.browser,
          os: data?.deviceInfo?.os,
          location: data?.location,
        });
      } else if (event === 'leave') {
        const viewer = await this.analyticsRepo.getViewerAnalytics(streamId, {
          sessionId,
          limit: 1,
        });

        if (viewer.length > 0) {
          const joinedAt = viewer[0].joinedAt;
          const watchTime = Math.floor((Date.now() - joinedAt.getTime()) / 1000);

          await this.analyticsRepo.updateViewerAnalytics(streamId, sessionId, {
            leftAt: new Date(),
            totalWatchTime: watchTime,
          });
        }
      } else if (event === 'update' && data?.metrics) {
        await this.analyticsRepo.updateViewerAnalytics(streamId, sessionId, {
          averageLatency: data.metrics.latency,
          averagePacketLoss: data.metrics.packetLoss,
          bufferingTime: data.metrics.bufferingTime,
        });
      }
    } catch (error) {
      console.error('Error updating viewer analytics:', error);
      throw error;
    }
  }

  /**
   * Detect and record quality events based on thresholds
   */
  private async detectQualityEvents(streamId: string, stats: VdoStreamStats) {
    const events: Prisma.StreamQualityEventCreateInput[] = [];

    // Check FPS issues
    if (stats.fps?.current && stats.fps.current < 20) {
      events.push({
        stream: { connect: { id: streamId } },
        eventType: 'quality_degraded',
        severity: stats.fps.current < 10 ? 'critical' : 'high',
        metric: 'fps',
        currentValue: stats.fps.current,
        threshold: 20,
        message: `FPS dropped to ${stats.fps.current}`,
        details: { fps: stats.fps },
      });
    }

    // Check packet loss
    if (stats.packetLoss && stats.packetLoss > 5) {
      events.push({
        stream: { connect: { id: streamId } },
        eventType: 'quality_degraded',
        severity: stats.packetLoss > 10 ? 'critical' : 'high',
        metric: 'packet_loss',
        currentValue: stats.packetLoss,
        threshold: 5,
        message: `High packet loss: ${stats.packetLoss.toFixed(1)}%`,
      });
    }

    // Check latency
    if (stats.latency && stats.latency > 500) {
      events.push({
        stream: { connect: { id: streamId } },
        eventType: 'quality_degraded',
        severity: stats.latency > 1000 ? 'critical' : 'high',
        metric: 'latency',
        currentValue: stats.latency,
        threshold: 500,
        message: `High latency: ${stats.latency}ms`,
      });
    }

    // Check connection quality
    if (stats.connectionQuality === 'poor' || stats.connectionQuality === 'critical') {
      events.push({
        stream: { connect: { id: streamId } },
        eventType: 'connection_lost',
        severity: stats.connectionQuality === 'critical' ? 'critical' : 'high',
        metric: 'connection',
        message: `Connection quality: ${stats.connectionQuality}`,
        details: {
          quality: stats.connectionQuality,
          score: stats.connectionScore,
        },
      });
    }

    // Create events
    for (const event of events) {
      await this.analyticsRepo.createQualityEvent(event);
    }

    // Auto-resolve previous events if quality improved
    if (stats.connectionQuality === 'excellent' || stats.connectionQuality === 'good') {
      const unresolvedEvents = await this.analyticsRepo.getQualityEvents(streamId, {
        resolved: false,
        since: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      });

      for (const event of unresolvedEvents) {
        // Check if the metric has improved
        let shouldResolve = false;

        switch (event.metric) {
          case 'fps':
            shouldResolve = stats.fps?.current ? stats.fps.current >= 25 : false;
            break;
          case 'packet_loss':
            shouldResolve = stats.packetLoss ? stats.packetLoss < 2 : false;
            break;
          case 'latency':
            shouldResolve = stats.latency ? stats.latency < 200 : false;
            break;
          case 'connection':
            shouldResolve =
              stats.connectionQuality === 'excellent' || stats.connectionQuality === 'good';
            break;
        }

        if (shouldResolve) {
          await this.analyticsRepo.resolveQualityEvent(event.id);
        }
      }
    }
  }

  /**
   * Update aggregated analytics for different time intervals
   */
  private async updateAggregatedAnalytics(streamId: string, stats: VdoStreamStats) {
    const now = new Date();

    for (const config of this.intervalConfigs) {
      const intervalStart = new Date(Math.floor(now.getTime() / config.duration) * config.duration);
      const intervalEnd = new Date(intervalStart.getTime() + config.duration);

      // Get existing analytics for this interval
      const existing = await this.analyticsRepo.getStreamAnalytics(
        streamId,
        config.type,
        intervalStart,
        intervalStart,
      );

      const currentData = existing[0] || {
        uniqueViewers: 0,
        peakViewers: 0,
        averageViewers: 0,
        totalViewTime: 0,
        averageFps: 0,
        minFps: Number.MAX_VALUE,
        maxFps: 0,
        averageBitrate: 0,
        minBitrate: Number.MAX_VALUE,
        maxBitrate: 0,
        averageLatency: 0,
        maxLatency: 0,
        averagePacketLoss: 0,
        maxPacketLoss: 0,
        averageJitter: 0,
        connectionScore: 100,
        reconnectCount: 0,
        totalBytesOut: BigInt(0),
        totalBytesIn: BigInt(0),
      };

      // Update with new stats
      const updateData: Prisma.StreamAnalyticsUpdateInput = {
        intervalEnd,
        timestamp: now,

        // Update viewer metrics
        peakViewers: Math.max(currentData.peakViewers, stats.viewerCount || 0),

        // Update FPS metrics
        averageFps: this.calculateRunningAverage(currentData.averageFps, stats.fps?.current || 0),
        minFps: Math.min(currentData.minFps, stats.fps?.current || Number.MAX_VALUE),
        maxFps: Math.max(currentData.maxFps, stats.fps?.current || 0),

        // Update bitrate metrics
        averageBitrate: this.calculateRunningAverage(
          currentData.averageBitrate,
          stats.bitrate || 0,
        ),
        minBitrate: Math.min(currentData.minBitrate, stats.bitrate || Number.MAX_VALUE),
        maxBitrate: Math.max(currentData.maxBitrate, stats.bitrate || 0),

        // Update network metrics
        averageLatency: this.calculateRunningAverage(
          currentData.averageLatency,
          stats.latency || 0,
        ),
        maxLatency: Math.max(currentData.maxLatency, stats.latency || 0),
        averagePacketLoss: this.calculateRunningAverage(
          currentData.averagePacketLoss,
          stats.packetLoss || 0,
        ),
        maxPacketLoss: Math.max(currentData.maxPacketLoss, stats.packetLoss || 0),
        averageJitter: this.calculateRunningAverage(currentData.averageJitter, stats.jitter || 0),

        // Update connection metrics
        connectionScore: stats.connectionScore || currentData.connectionScore,
        qualityRating: stats.connectionQuality || 'good',

        // Update data usage
        totalBytesOut: BigInt(currentData.totalBytesOut) + BigInt(stats.bytesSent || 0),
        totalBytesIn: BigInt(currentData.totalBytesIn) + BigInt(stats.bytesReceived || 0),

        // Resolution
        averageResolution: stats.resolution
          ? `${stats.resolution.width}x${stats.resolution.height}`
          : currentData.averageResolution,
      };

      await this.analyticsRepo.upsertStreamAnalytics(
        streamId,
        config.type,
        intervalStart,
        updateData,
      );
    }
  }

  /**
   * Run cleanup for old analytics data
   */
  async runCleanup() {
    try {
      const now = new Date();

      // Cleanup realtime stats older than 24 hours
      await this.analyticsRepo.cleanupOldRealtimeStats(
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
      );

      // Cleanup aggregated analytics based on retention policy
      for (const config of this.intervalConfigs) {
        const retentionDate = new Date(now.getTime() - config.retention * 24 * 60 * 60 * 1000);
        await this.analyticsRepo.cleanupOldAnalytics(config.type, retentionDate);
      }

      // Cleanup resolved quality events older than 7 days
      await this.analyticsRepo.cleanupResolvedQualityEvents(
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      );

      console.log('Analytics cleanup completed successfully');
    } catch (error) {
      console.error('Error during analytics cleanup:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for a stream
   */
  async getStreamAnalytics(
    streamId: string,
    options?: {
      intervalType?: string;
      startDate?: Date;
      endDate?: Date;
      includeRealtime?: boolean;
      includeQualityEvents?: boolean;
      includeViewerStats?: boolean;
    },
  ) {
    const {
      intervalType,
      startDate,
      endDate,
      includeRealtime = false,
      includeQualityEvents = false,
      includeViewerStats = false,
    } = options || {};

    const result: any = {
      analytics: await this.analyticsRepo.getStreamAnalytics(
        streamId,
        intervalType,
        startDate,
        endDate,
      ),
    };

    if (includeRealtime) {
      result.realtimeStats = await this.analyticsRepo.getLatestRealtimeStats(streamId);
    }

    if (includeQualityEvents) {
      result.qualityEvents = await this.analyticsRepo.getQualityEvents(streamId, {
        since: startDate,
        limit: 50,
      });
    }

    if (includeViewerStats) {
      result.viewerStats = await this.analyticsRepo.getViewerEngagementStats(streamId);
    }

    return result;
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardAnalytics(userId?: string, dateRange?: { start: Date; end: Date }) {
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end || new Date();

    const [summary, topStreams] = await Promise.all([
      this.analyticsRepo.getAnalyticsSummary(undefined, startDate, endDate),
      this.analyticsRepo.getTopStreams(startDate, endDate, 10),
    ]);

    return {
      summary,
      topStreams,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Get detailed performance report for a stream
   */
  async getStreamPerformanceReport(streamId: string) {
    return this.analyticsRepo.getStreamPerformanceReport(streamId);
  }

  // Helper methods
  private calculateRunningAverage(
    currentAvg: number,
    newValue: number,
    weight: number = 0.1,
  ): number {
    return currentAvg * (1 - weight) + newValue * weight;
  }

  private mapConnectionState(stats: VdoStreamStats): string {
    if (
      stats.connectionQuality === 'critical' ||
      (stats.connectionScore && stats.connectionScore < 20)
    ) {
      return 'disconnected';
    }
    if (
      stats.connectionQuality === 'poor' ||
      (stats.connectionScore && stats.connectionScore < 50)
    ) {
      return 'reconnecting';
    }
    return 'connected';
  }
}
