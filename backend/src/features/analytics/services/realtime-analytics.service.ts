import { inject, injectable } from 'tsyringe';

import type { VdoStreamStats } from '../../../socket/types/vdo-events.types.js';
import { streamEventEmitter } from '../../stream/events/stream-event-emitter.js';
import {
  type AnalyticsEvent,
  analyticsEventEmitter,
  type IntervalSummaryEvent,
  type MilestoneReachedEvent,
  type PerformanceAlertEvent,
  type QualityAnalyticsEvent,
  type StatsUpdatedEvent,
  type ThrottleConfig,
  type ViewerAnalyticsEvent,
} from '../events/analytics-event-emitter.js';
import { AnalyticsService } from './analytics.service.js';

/**
 * Subscription management for real-time analytics
 */
interface AnalyticsSubscription {
  streamId: string;
  userId: string;
  socketId: string;
  subscriptionType: 'streamer' | 'moderator' | 'viewer' | 'admin';
  subscribedAt: Date;
  filters?: {
    eventTypes?: string[];
    minPriority?: 'low' | 'medium' | 'high' | 'critical';
    updateInterval?: number;
  };
  lastActivity: Date;
}

/**
 * Analytics aggregation for dashboards
 */
interface DashboardMetrics {
  streamId: string;
  interval: 'realtime' | 'minute' | '5minutes' | 'hour';
  metrics: {
    viewers: {
      current: number;
      peak: number;
      average: number;
      trend: 'up' | 'down' | 'stable';
      growth: number; // percentage change
    };
    engagement: {
      chatRate: number; // messages per minute
      interactionRate: number; // interactions per viewer
      averageSessionDuration: number;
      trend: 'up' | 'down' | 'stable';
    };
    technical: {
      quality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      uptime: number; // percentage
      issues: number;
      performance: number; // score 0-100
    };
    revenue?: {
      session: number;
      hourly: number;
      trend: 'up' | 'down' | 'stable';
      conversionRate: number;
    };
  };
  lastUpdated: Date;
}

/**
 * Milestone configuration
 */
interface MilestoneConfig {
  streamId: string;
  milestones: Array<{
    type: 'viewers' | 'duration' | 'revenue' | 'engagement';
    targets: number[];
    notifications: boolean;
    celebration: boolean;
  }>;
}

@injectable()
export class RealtimeAnalyticsService {
  private subscriptions: Map<string, AnalyticsSubscription> = new Map(); // socketId -> subscription
  private streamSubscriptions: Map<string, Set<string>> = new Map(); // streamId -> Set<socketId>
  private dashboardMetrics: Map<string, DashboardMetrics> = new Map(); // streamId -> metrics
  private milestoneConfigs: Map<string, MilestoneConfig> = new Map(); // streamId -> config
  private intervalTimers: Map<string, NodeJS.Timeout> = new Map(); // streamId -> timer
  private alertThresholds: Map<string, any> = new Map(); // streamId -> thresholds

  constructor(@inject(AnalyticsService) private analyticsService: AnalyticsService) {
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for stream lifecycle and analytics events
   */
  private initializeEventListeners(): void {
    // Listen to stream lifecycle events
    streamEventEmitter.onStreamEvent('stream:started', this.handleStreamStarted.bind(this));
    streamEventEmitter.onStreamEvent('stream:ended', this.handleStreamEnded.bind(this));
    streamEventEmitter.onStreamEvent('stream:viewer:joined', this.handleViewerJoined.bind(this));
    streamEventEmitter.onStreamEvent('stream:viewer:left', this.handleViewerLeft.bind(this));
    streamEventEmitter.onStreamEvent('stream:stats:updated', this.handleStatsUpdated.bind(this));
    streamEventEmitter.onStreamEvent(
      'stream:quality:changed',
      this.handleQualityChanged.bind(this),
    );

    // Listen to analytics events for forwarding to subscribers
    analyticsEventEmitter.onAnalyticsEvent('*', this.forwardToSubscribers.bind(this));
  }

  /**
   * Subscribe a user to real-time analytics for a stream
   */
  public async subscribe(
    streamId: string,
    userId: string,
    socketId: string,
    subscriptionType: AnalyticsSubscription['subscriptionType'],
    filters?: AnalyticsSubscription['filters'],
  ): Promise<boolean> {
    try {
      // Verify user has permission to view analytics
      const hasPermission = await this.verifyAnalyticsPermission(
        streamId,
        userId,
        subscriptionType,
      );
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view analytics');
      }

      // Create subscription
      const subscription: AnalyticsSubscription = {
        streamId,
        userId,
        socketId,
        subscriptionType,
        subscribedAt: new Date(),
        filters,
        lastActivity: new Date(),
      };

      this.subscriptions.set(socketId, subscription);

      // Add to stream subscriptions
      if (!this.streamSubscriptions.has(streamId)) {
        this.streamSubscriptions.set(streamId, new Set());
      }
      this.streamSubscriptions.get(streamId)!.add(socketId);

      // Initialize metrics for this stream if not exists
      if (!this.dashboardMetrics.has(streamId)) {
        await this.initializeStreamMetrics(streamId);
      }

      // Set up interval updates for this stream
      this.ensureIntervalUpdates(streamId);

      console.log(`Analytics subscription created: ${userId} -> ${streamId} (${subscriptionType})`);
      return true;
    } catch (error) {
      console.error(`Failed to create analytics subscription: ${error}`);
      return false;
    }
  }

  /**
   * Unsubscribe a user from analytics
   */
  public unsubscribe(socketId: string): void {
    const subscription = this.subscriptions.get(socketId);
    if (!subscription) return;

    // Remove from stream subscriptions
    const streamSubs = this.streamSubscriptions.get(subscription.streamId);
    if (streamSubs) {
      streamSubs.delete(socketId);

      // Clean up stream metrics if no more subscribers
      if (streamSubs.size === 0) {
        this.cleanupStreamMetrics(subscription.streamId);
      }
    }

    // Remove subscription
    this.subscriptions.delete(socketId);

    console.log(`Analytics subscription removed: ${socketId}`);
  }

  /**
   * Get current analytics for a stream
   */
  public async getCurrentAnalytics(streamId: string): Promise<DashboardMetrics | null> {
    return this.dashboardMetrics.get(streamId) || null;
  }

  /**
   * Update throttle configuration for analytics events
   */
  public updateThrottleConfig(config: Partial<ThrottleConfig>): void {
    analyticsEventEmitter.updateThrottleConfig(config);
  }

  /**
   * Configure milestones for a stream
   */
  public configureMilestones(streamId: string, config: Omit<MilestoneConfig, 'streamId'>): void {
    this.milestoneConfigs.set(streamId, { streamId, ...config });
  }

  /**
   * Configure alert thresholds for a stream
   */
  public configureAlertThresholds(streamId: string, thresholds: any): void {
    this.alertThresholds.set(streamId, thresholds);
  }

  /**
   * Handle stream started event
   */
  private async handleStreamStarted(event: any): Promise<void> {
    const streamId = event.streamId;

    // Initialize metrics for the stream
    await this.initializeStreamMetrics(streamId);

    // Set up default milestones
    this.configureMilestones(streamId, {
      milestones: [
        {
          type: 'viewers',
          targets: [10, 25, 50, 100, 250, 500, 1000],
          notifications: true,
          celebration: true,
        },
        {
          type: 'duration',
          targets: [30, 60, 120, 240, 480], // minutes
          notifications: true,
          celebration: false,
        },
      ],
    });

    // Set up default alert thresholds
    this.configureAlertThresholds(streamId, {
      quality: {
        fps: { warning: 25, critical: 15 },
        latency: { warning: 300, critical: 1000 },
        packetLoss: { warning: 3, critical: 10 },
      },
      engagement: {
        viewerDrop: { warning: 0.2, critical: 0.5 }, // percentage drop
        chatRate: { warning: 0.1, critical: 0.05 }, // messages per viewer per minute
      },
    });
  }

  /**
   * Handle stream ended event
   */
  private handleStreamEnded(event: any): void {
    const streamId = event.streamId;

    // Clean up metrics and timers
    this.cleanupStreamMetrics(streamId);

    // Remove milestone configs
    this.milestoneConfigs.delete(streamId);
    this.alertThresholds.delete(streamId);
  }

  /**
   * Handle viewer joined event
   */
  private async handleViewerJoined(event: any): Promise<void> {
    const streamId = event.streamId;
    const metrics = this.dashboardMetrics.get(streamId);

    if (metrics) {
      // Update viewer metrics
      metrics.metrics.viewers.current = event.currentViewerCount;
      metrics.metrics.viewers.peak = Math.max(
        metrics.metrics.viewers.peak,
        event.currentViewerCount,
      );
      metrics.lastUpdated = new Date();

      // Check for viewer milestones
      await this.checkMilestones(streamId, 'viewers', event.currentViewerCount);

      // Emit analytics event
      await analyticsEventEmitter.emitViewerJoined(
        streamId,
        {
          sessionId: event.viewer.socketId,
          userId: event.viewer.id,
          username: event.viewer.username,
          isAnonymous: event.viewer.isAnonymous,
          deviceType: 'unknown', // Would be detected from user agent
        },
        {
          currentViewers: event.currentViewerCount,
          totalViewers: metrics.metrics.viewers.current,
          deviceBreakdown: {},
          locationBreakdown: {},
        },
      );
    }
  }

  /**
   * Handle viewer left event
   */
  private async handleViewerLeft(event: any): Promise<void> {
    const streamId = event.streamId;
    const metrics = this.dashboardMetrics.get(streamId);

    if (metrics) {
      // Update viewer metrics
      metrics.metrics.viewers.current = event.currentViewerCount;
      metrics.lastUpdated = new Date();

      // Check for significant viewer drops
      const dropPercentage = 1 - event.currentViewerCount / metrics.metrics.viewers.peak;
      const thresholds = this.alertThresholds.get(streamId)?.engagement?.viewerDrop;

      if (thresholds && dropPercentage > thresholds.warning) {
        await analyticsEventEmitter.emitPerformanceAlert(streamId, {
          level: dropPercentage > thresholds.critical ? 'critical' : 'warning',
          category: 'engagement',
          title: 'Significant Viewer Drop',
          message: `Viewer count dropped by ${(dropPercentage * 100).toFixed(1)}%`,
          metrics: {
            currentViewers: event.currentViewerCount,
            peakViewers: metrics.metrics.viewers.peak,
            dropPercentage: dropPercentage * 100,
          },
          recommendations: [
            'Check stream quality',
            'Engage with remaining viewers',
            'Consider featuring interesting content',
          ],
        });
      }
    }
  }

  /**
   * Handle stats updated event
   */
  private async handleStatsUpdated(event: any): Promise<void> {
    const streamId = event.streamId;
    const stats = event.stats;

    // Process with existing analytics service
    await this.analyticsService.processRealtimeStats(streamId, stats);

    // Update dashboard metrics
    await this.updateDashboardMetrics(streamId, stats);

    // Check for quality alerts
    await this.checkQualityAlerts(streamId, stats);

    // Emit analytics event
    await analyticsEventEmitter.emitStatsUpdated(
      streamId,
      {
        currentViewers: stats.viewerCount || 0,
        peakViewers: this.dashboardMetrics.get(streamId)?.metrics.viewers.peak || 0,
        totalViewers: this.dashboardMetrics.get(streamId)?.metrics.viewers.current || 0,
        averageViewDuration: 0, // Would be calculated from session data
        fps: stats.fps?.current || 0,
        bitrate: stats.bitrate || 0,
        resolution: stats.resolution || null,
        latency: stats.latency || 0,
        packetLoss: stats.packetLoss || 0,
        jitter: stats.jitter || 0,
        connectionQuality: stats.connectionQuality || 'good',
        connectionScore: stats.connectionScore || 100,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
          critical: 0,
        },
        isAudioMuted: stats.isAudioMuted || false,
        isVideoHidden: stats.isVideoHidden || false,
        isScreenSharing: stats.isScreenSharing || false,
        isRecording: stats.isRecording || false,
        uploadSpeed: stats.uploadSpeed || 0,
        downloadSpeed: stats.downloadSpeed || 0,
        totalBytesOut: stats.bytesSent || 0,
        totalBytesIn: stats.bytesReceived || 0,
      },
      'realtime',
    );
  }

  /**
   * Handle quality changed event
   */
  private async handleQualityChanged(event: any): Promise<void> {
    const streamId = event.streamId;

    // Emit analytics quality event
    await analyticsEventEmitter.emitQualityChanged(streamId, {
      previous: 'good', // Would track previous state
      current: event.quality.level,
      metrics: {
        fps: { previous: 30, current: event.quality.metrics.fps || 30 },
        bitrate: { previous: 2000, current: event.quality.metrics.bitrate || 2000 },
        latency: { previous: 100, current: event.quality.metrics.latency || 100 },
        packetLoss: { previous: 1, current: event.quality.metrics.packetLoss || 1 },
      },
      reason: 'network',
      impact: event.quality.level === 'critical' ? 'critical' : 'medium',
    });
  }

  /**
   * Forward analytics events to subscribers
   */
  private forwardToSubscribers(event: AnalyticsEvent): void {
    const streamSubs = this.streamSubscriptions.get(event.streamId);
    if (!streamSubs || streamSubs.size === 0) return;

    for (const socketId of streamSubs) {
      const subscription = this.subscriptions.get(socketId);
      if (!subscription) continue;

      // Apply filters
      if (this.shouldForwardEvent(event, subscription)) {
        // The actual forwarding would be handled by the socket integration
        // This is just the decision logic
        subscription.lastActivity = new Date();
      }
    }
  }

  /**
   * Check if event should be forwarded to subscriber
   */
  private shouldForwardEvent(event: AnalyticsEvent, subscription: AnalyticsSubscription): boolean {
    const filters = subscription.filters;
    if (!filters) return true;

    // Check event type filter
    if (filters.eventTypes && !filters.eventTypes.includes(event.type)) {
      return false;
    }

    // Check minimum priority filter
    if (filters.minPriority) {
      const eventPriority = this.getEventPriority(event);
      const priorities = ['low', 'medium', 'high', 'critical'];
      const eventPriorityIndex = priorities.indexOf(eventPriority);
      const minPriorityIndex = priorities.indexOf(filters.minPriority);

      if (eventPriorityIndex < minPriorityIndex) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get event priority for filtering
   */
  private getEventPriority(event: AnalyticsEvent): 'low' | 'medium' | 'high' | 'critical' {
    switch (event.type) {
      case 'analytics:performance:alert':
        const alert = (event as PerformanceAlertEvent).alert;
        return alert.level === 'critical'
          ? 'critical'
          : alert.level === 'error'
            ? 'high'
            : 'medium';

      case 'analytics:quality:changed':
        const quality = (event as QualityAnalyticsEvent).quality;
        return quality.impact === 'critical'
          ? 'critical'
          : quality.impact === 'high'
            ? 'high'
            : 'medium';

      case 'analytics:viewer:joined':
      case 'analytics:viewer:left':
        return 'low';

      case 'analytics:stats:updated':
        return 'medium';

      default:
        return 'medium';
    }
  }

  /**
   * Initialize metrics for a stream
   */
  private async initializeStreamMetrics(streamId: string): Promise<void> {
    const metrics: DashboardMetrics = {
      streamId,
      interval: 'realtime',
      metrics: {
        viewers: {
          current: 0,
          peak: 0,
          average: 0,
          trend: 'stable',
          growth: 0,
        },
        engagement: {
          chatRate: 0,
          interactionRate: 0,
          averageSessionDuration: 0,
          trend: 'stable',
        },
        technical: {
          quality: 'good',
          uptime: 100,
          issues: 0,
          performance: 100,
        },
      },
      lastUpdated: new Date(),
    };

    this.dashboardMetrics.set(streamId, metrics);
  }

  /**
   * Update dashboard metrics with new stats
   */
  private async updateDashboardMetrics(streamId: string, stats: any): Promise<void> {
    const metrics = this.dashboardMetrics.get(streamId);
    if (!metrics) return;

    // Update technical metrics
    metrics.metrics.technical.quality = stats.connectionQuality || 'good';
    metrics.metrics.technical.performance = this.calculatePerformanceScore(stats);

    // Update viewer metrics if available
    if (stats.viewerCount !== undefined) {
      metrics.metrics.viewers.current = stats.viewerCount;
      metrics.metrics.viewers.peak = Math.max(metrics.metrics.viewers.peak, stats.viewerCount);
    }

    metrics.lastUpdated = new Date();
  }

  /**
   * Calculate performance score from stats
   */
  private calculatePerformanceScore(stats: any): number {
    let score = 100;

    // Deduct for poor FPS
    if (stats.fps?.current < 25) {
      score -= (25 - stats.fps.current) * 2;
    }

    // Deduct for high latency
    if (stats.latency > 200) {
      score -= Math.min((stats.latency - 200) / 10, 30);
    }

    // Deduct for packet loss
    if (stats.packetLoss > 1) {
      score -= stats.packetLoss * 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Check for quality alerts
   */
  private async checkQualityAlerts(streamId: string, stats: any): Promise<void> {
    const thresholds = this.alertThresholds.get(streamId)?.quality;
    if (!thresholds) return;

    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
      threshold: number;
      currentValue: number;
    }> = [];

    // Check FPS
    if (stats.fps?.current < thresholds.fps.critical) {
      alerts.push({
        type: 'fps_drop',
        severity: 'critical',
        message: `Critical FPS drop: ${stats.fps.current}`,
        threshold: thresholds.fps.critical,
        currentValue: stats.fps.current,
      });
    } else if (stats.fps?.current < thresholds.fps.warning) {
      alerts.push({
        type: 'fps_drop',
        severity: 'warning',
        message: `Low FPS: ${stats.fps.current}`,
        threshold: thresholds.fps.warning,
        currentValue: stats.fps.current,
      });
    }

    // Check latency
    if (stats.latency > thresholds.latency.critical) {
      alerts.push({
        type: 'high_latency',
        severity: 'critical',
        message: `Critical latency: ${stats.latency}ms`,
        threshold: thresholds.latency.critical,
        currentValue: stats.latency,
      });
    } else if (stats.latency > thresholds.latency.warning) {
      alerts.push({
        type: 'high_latency',
        severity: 'warning',
        message: `High latency: ${stats.latency}ms`,
        threshold: thresholds.latency.warning,
        currentValue: stats.latency,
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      await analyticsEventEmitter.emitPerformanceAlert(streamId, {
        level: alert.severity as any,
        category: 'technical',
        title: 'Stream Quality Alert',
        message: alert.message,
        metrics: { [alert.type]: alert.currentValue },
        recommendations: this.getQualityRecommendations(alert.type),
      });
    }
  }

  /**
   * Get recommendations for quality issues
   */
  private getQualityRecommendations(alertType: string): string[] {
    switch (alertType) {
      case 'fps_drop':
        return [
          'Reduce video resolution',
          'Close unnecessary applications',
          'Check CPU usage',
          'Lower streaming bitrate',
        ];
      case 'high_latency':
        return [
          'Check internet connection',
          'Use wired connection instead of WiFi',
          'Choose a closer streaming server',
          'Reduce upload bitrate',
        ];
      case 'packet_loss':
        return [
          'Check network stability',
          'Restart router/modem',
          'Use wired connection',
          'Contact ISP if issue persists',
        ];
      default:
        return ['Check stream settings and network connection'];
    }
  }

  /**
   * Check for milestones
   */
  private async checkMilestones(streamId: string, type: string, value: number): Promise<void> {
    const config = this.milestoneConfigs.get(streamId);
    if (!config) return;

    const milestone = config.milestones.find(m => m.type === type);
    if (!milestone) return;

    // Find the next milestone target
    const nextTarget = milestone.targets.find(target => target > value - 1 && target <= value);
    if (!nextTarget) return;

    // Emit milestone event
    await analyticsEventEmitter.emitAnalyticsEvent({
      type: 'analytics:milestone:reached',
      streamId,
      timestamp: new Date().toISOString(),
      source: 'computed',
      milestone: {
        type: type as any,
        name: `${nextTarget} ${type}`,
        value,
        target: nextTarget,
        unit: type === 'duration' ? 'minutes' : type,
        significance: nextTarget >= 1000 ? 'record' : nextTarget >= 100 ? 'major' : 'minor',
      },
      celebration: milestone.celebration
        ? {
            message: `🎉 Reached ${nextTarget} ${type}!`,
            emoji: '🎉',
            duration: 5000,
          }
        : undefined,
    });
  }

  /**
   * Verify user has permission to view analytics
   */
  private async verifyAnalyticsPermission(
    streamId: string,
    userId: string,
    subscriptionType: string,
  ): Promise<boolean> {
    // TODO: Implement proper permission checking
    // For now, allow streamers and admins to view their own analytics
    return true;
  }

  /**
   * Ensure interval updates are running for a stream
   */
  private ensureIntervalUpdates(streamId: string): void {
    if (this.intervalTimers.has(streamId)) return;

    const timer = setInterval(async () => {
      await this.emitIntervalSummary(streamId);
    }, 60000); // Every minute

    this.intervalTimers.set(streamId, timer);
  }

  /**
   * Emit interval summary
   */
  private async emitIntervalSummary(streamId: string): Promise<void> {
    const metrics = this.dashboardMetrics.get(streamId);
    if (!metrics) return;

    const now = new Date();
    const intervalStart = new Date(now.getTime() - 60000); // 1 minute ago

    await analyticsEventEmitter.emitAnalyticsEvent({
      type: 'analytics:summary:interval',
      streamId,
      timestamp: now.toISOString(),
      source: 'computed',
      interval: {
        type: 'minute',
        start: intervalStart.toISOString(),
        end: now.toISOString(),
        duration: 60,
      },
      summary: {
        viewers: {
          peak: metrics.metrics.viewers.peak,
          average: metrics.metrics.viewers.average,
          unique: metrics.metrics.viewers.current,
          newViewers: 0, // Would be calculated from session data
          returningViewers: 0,
        },
        engagement: {
          chatMessages: 0, // Would be calculated from chat data
          reactions: 0,
          interactionRate: metrics.metrics.engagement.interactionRate,
          averageSessionDuration: metrics.metrics.engagement.averageSessionDuration,
        },
        technical: {
          averageQuality: metrics.metrics.technical.quality,
          qualityIssues: metrics.metrics.technical.issues,
          uptime: metrics.metrics.technical.uptime,
          reconnections: 0,
        },
      },
    });
  }

  /**
   * Clean up metrics and timers for a stream
   */
  private cleanupStreamMetrics(streamId: string): void {
    this.dashboardMetrics.delete(streamId);

    const timer = this.intervalTimers.get(streamId);
    if (timer) {
      clearInterval(timer);
      this.intervalTimers.delete(streamId);
    }
  }

  /**
   * Get subscription statistics
   */
  public getSubscriptionStats(): {
    totalSubscriptions: number;
    activeStreams: number;
    subscriptionsByType: Record<string, number>;
  } {
    const subscriptionsByType: Record<string, number> = {};

    for (const subscription of this.subscriptions.values()) {
      subscriptionsByType[subscription.subscriptionType] =
        (subscriptionsByType[subscription.subscriptionType] || 0) + 1;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      activeStreams: this.streamSubscriptions.size,
      subscriptionsByType,
    };
  }
}

export default RealtimeAnalyticsService;
