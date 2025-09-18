import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * Real-time analytics event types
 */
export type AnalyticsEventType =
  | 'analytics:stats:updated'
  | 'analytics:viewer:joined'
  | 'analytics:viewer:left'
  | 'analytics:quality:changed'
  | 'analytics:engagement:spike'
  | 'analytics:revenue:updated'
  | 'analytics:performance:alert'
  | 'analytics:milestone:reached'
  | 'analytics:summary:interval';

/**
 * Base analytics event interface
 */
export interface BaseAnalyticsEvent {
  streamId: string;
  timestamp: string;
  source: 'vdo_ninja' | 'socket' | 'database' | 'computed';
  metadata?: Record<string, any>;
}

/**
 * Real-time stats update event
 */
export interface StatsUpdatedEvent extends BaseAnalyticsEvent {
  type: 'analytics:stats:updated';
  stats: {
    // Viewer metrics
    currentViewers: number;
    peakViewers: number;
    totalViewers: number;
    averageViewDuration: number;

    // Technical metrics
    fps: number;
    bitrate: number;
    resolution: { width: number; height: number } | null;
    latency: number;
    packetLoss: number;
    jitter: number;

    // Connection quality
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    connectionScore: number;
    qualityDistribution: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
      critical: number;
    };

    // Audio/Video state
    isAudioMuted: boolean;
    isVideoHidden: boolean;
    isScreenSharing: boolean;
    isRecording: boolean;

    // Network metrics
    uploadSpeed: number;
    downloadSpeed: number;
    totalBytesOut: number;
    totalBytesIn: number;
  };
  interval: 'realtime' | 'minute' | '5minutes' | '15minutes' | 'hour';
}

/**
 * Viewer analytics event
 */
export interface ViewerAnalyticsEvent extends BaseAnalyticsEvent {
  type: 'analytics:viewer:joined' | 'analytics:viewer:left';
  viewer: {
    sessionId: string;
    userId?: string;
    username?: string;
    isAnonymous: boolean;
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    browser?: string;
    os?: string;
    location?: string;
    connectionMetrics?: {
      latency: number;
      packetLoss: number;
      bandwidth: number;
    };
  };
  session?: {
    joinedAt: string;
    leftAt?: string;
    duration?: number; // in seconds
    engagement?: {
      messagesCount: number;
      reactionsCount: number;
      interactionScore: number;
    };
  };
  aggregated: {
    currentViewers: number;
    totalViewers: number;
    deviceBreakdown: Record<string, number>;
    locationBreakdown: Record<string, number>;
  };
}

/**
 * Quality analytics event
 */
export interface QualityAnalyticsEvent extends BaseAnalyticsEvent {
  type: 'analytics:quality:changed';
  quality: {
    previous: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    current: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    metrics: {
      fps: { previous: number; current: number };
      bitrate: { previous: number; current: number };
      latency: { previous: number; current: number };
      packetLoss: { previous: number; current: number };
    };
    reason: 'network' | 'hardware' | 'settings' | 'external';
    impact: 'low' | 'medium' | 'high' | 'critical';
  };
  alerts: Array<{
    type: 'fps_drop' | 'high_latency' | 'packet_loss' | 'connection_unstable';
    severity: 'warning' | 'error' | 'critical';
    message: string;
    threshold: number;
    currentValue: number;
  }>;
}

/**
 * Engagement spike event
 */
export interface EngagementSpikeEvent extends BaseAnalyticsEvent {
  type: 'analytics:engagement:spike';
  engagement: {
    type: 'viewers' | 'chat' | 'reactions' | 'donations';
    baseline: number;
    current: number;
    spike: number; // percentage increase
    duration: number; // spike duration in seconds
  };
  trigger?: {
    event: 'product_featured' | 'announcement' | 'interaction' | 'external';
    details: Record<string, any>;
  };
}

/**
 * Revenue analytics event
 */
export interface RevenueAnalyticsEvent extends BaseAnalyticsEvent {
  type: 'analytics:revenue:updated';
  revenue: {
    current: {
      donations: number;
      subscriptions: number;
      productSales: number;
      total: number;
    };
    session: {
      donations: number;
      subscriptions: number;
      productSales: number;
      total: number;
    };
    goals: {
      target: number;
      progress: number;
      percentage: number;
    };
  };
  currency: string;
  transactions: Array<{
    type: 'donation' | 'subscription' | 'product_sale';
    amount: number;
    timestamp: string;
    source?: string;
  }>;
}

/**
 * Performance alert event
 */
export interface PerformanceAlertEvent extends BaseAnalyticsEvent {
  type: 'analytics:performance:alert';
  alert: {
    level: 'info' | 'warning' | 'error' | 'critical';
    category: 'technical' | 'engagement' | 'business' | 'security';
    title: string;
    message: string;
    metrics: Record<string, number>;
    recommendations: string[];
    autoResolution?: {
      attempted: boolean;
      successful?: boolean;
      action?: string;
    };
  };
}

/**
 * Milestone reached event
 */
export interface MilestoneReachedEvent extends BaseAnalyticsEvent {
  type: 'analytics:milestone:reached';
  milestone: {
    type: 'viewers' | 'duration' | 'revenue' | 'engagement' | 'technical';
    name: string;
    value: number;
    target: number;
    unit: string;
    significance: 'minor' | 'major' | 'record';
  };
  celebration?: {
    message: string;
    emoji: string;
    duration: number;
  };
}

/**
 * Interval summary event
 */
export interface IntervalSummaryEvent extends BaseAnalyticsEvent {
  type: 'analytics:summary:interval';
  interval: {
    type: 'minute' | '5minutes' | '15minutes' | 'hour';
    start: string;
    end: string;
    duration: number; // in seconds
  };
  summary: {
    viewers: {
      peak: number;
      average: number;
      unique: number;
      newViewers: number;
      returningViewers: number;
    };
    engagement: {
      chatMessages: number;
      reactions: number;
      interactionRate: number;
      averageSessionDuration: number;
    };
    technical: {
      averageQuality: string;
      qualityIssues: number;
      uptime: number; // percentage
      reconnections: number;
    };
    revenue?: {
      total: number;
      transactions: number;
      averageTransaction: number;
    };
  };
}

/**
 * Union type for all analytics events
 */
export type AnalyticsEvent =
  | StatsUpdatedEvent
  | ViewerAnalyticsEvent
  | QualityAnalyticsEvent
  | EngagementSpikeEvent
  | RevenueAnalyticsEvent
  | PerformanceAlertEvent
  | MilestoneReachedEvent
  | IntervalSummaryEvent;

/**
 * Analytics event listener function type
 */
export type AnalyticsEventListener<T extends AnalyticsEvent = AnalyticsEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * Data throttling configuration
 */
export interface ThrottleConfig {
  enabled: boolean;
  intervals: {
    realtime: number; // ms between realtime updates
    aggregated: number; // ms between aggregated updates
    alerts: number; // ms between alert checks
  };
  batchSize: {
    stats: number; // max stats events per batch
    viewers: number; // max viewer events per batch
    alerts: number; // max alerts per batch
  };
  priorities: {
    critical: number; // always send immediately
    high: number; // max delay for high priority
    medium: number; // max delay for medium priority
    low: number; // max delay for low priority
  };
}

/**
 * Default throttling configuration
 */
export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  enabled: true,
  intervals: {
    realtime: 1000, // 1 second
    aggregated: 5000, // 5 seconds
    alerts: 500, // 0.5 seconds
  },
  batchSize: {
    stats: 10,
    viewers: 20,
    alerts: 5,
  },
  priorities: {
    critical: 0, // immediate
    high: 1000, // 1 second max delay
    medium: 3000, // 3 seconds max delay
    low: 10000, // 10 seconds max delay
  },
};

/**
 * Event validation schemas
 */
const baseEventSchema = z.object({
  streamId: z.string().min(1),
  timestamp: z.string().datetime(),
  source: z.enum(['vdo_ninja', 'socket', 'database', 'computed']),
  metadata: z.record(z.any()).optional(),
});

const statsUpdatedSchema = baseEventSchema.extend({
  type: z.literal('analytics:stats:updated'),
  stats: z.object({
    currentViewers: z.number().min(0),
    peakViewers: z.number().min(0),
    totalViewers: z.number().min(0),
    averageViewDuration: z.number().min(0),
    fps: z.number().min(0),
    bitrate: z.number().min(0),
    latency: z.number().min(0),
    packetLoss: z.number().min(0).max(100),
    connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
    connectionScore: z.number().min(0).max(100),
  }),
  interval: z.enum(['realtime', 'minute', '5minutes', '15minutes', 'hour']),
});

/**
 * Real-time Analytics Event Emitter
 * Handles all analytics events with throttling and validation
 */
export class AnalyticsEventEmitter extends EventEmitter {
  private static instance: AnalyticsEventEmitter;
  private throttleConfig: ThrottleConfig;
  private eventQueue: Map<string, AnalyticsEvent[]> = new Map(); // Stream ID -> Events
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastEmitTimes: Map<string, Map<string, number>> = new Map(); // Stream ID -> Event Type -> Last Emit Time
  private eventHistory: Map<string, AnalyticsEvent[]> = new Map(); // Stream ID -> Events
  private maxHistoryPerStream = 50;

  private constructor(throttleConfig: Partial<ThrottleConfig> = {}) {
    super();
    this.throttleConfig = { ...DEFAULT_THROTTLE_CONFIG, ...throttleConfig };
    this.setMaxListeners(100); // Allow many listeners
  }

  /**
   * Get singleton instance
   */
  public static getInstance(throttleConfig?: Partial<ThrottleConfig>): AnalyticsEventEmitter {
    if (!AnalyticsEventEmitter.instance) {
      AnalyticsEventEmitter.instance = new AnalyticsEventEmitter(throttleConfig);
    }
    return AnalyticsEventEmitter.instance;
  }

  /**
   * Emit an analytics event with throttling and validation
   */
  public async emitAnalyticsEvent<T extends AnalyticsEvent>(event: T): Promise<boolean> {
    try {
      // Validate event
      this.validateEvent(event);

      // Store in history
      this.addToHistory(event);

      // Determine priority
      const priority = this.getEventPriority(event);

      // Apply throttling if enabled
      if (this.throttleConfig.enabled && priority !== 'critical') {
        return this.throttleAndEmit(event, priority);
      } else {
        // Emit immediately for critical events
        return this.doEmit(event);
      }
    } catch (error) {
      console.error('Failed to emit analytics event:', error);
      return false;
    }
  }

  /**
   * Add typed event listener
   */
  public onAnalyticsEvent<T extends AnalyticsEvent>(
    eventType: T['type'] | '*',
    listener: AnalyticsEventListener<T>,
  ): this {
    return this.on(eventType, listener);
  }

  /**
   * Remove typed event listener
   */
  public offAnalyticsEvent<T extends AnalyticsEvent>(
    eventType: T['type'] | '*',
    listener: AnalyticsEventListener<T>,
  ): this {
    return this.off(eventType, listener);
  }

  /**
   * Get event history for a stream
   */
  public getStreamHistory(streamId: string): AnalyticsEvent[] {
    return this.eventHistory.get(streamId) || [];
  }

  /**
   * Update throttle configuration
   */
  public updateThrottleConfig(config: Partial<ThrottleConfig>): void {
    this.throttleConfig = { ...this.throttleConfig, ...config };
  }

  /**
   * Get current throttle configuration
   */
  public getThrottleConfig(): ThrottleConfig {
    return { ...this.throttleConfig };
  }

  /**
   * Clear event queue for a stream
   */
  public clearStreamQueue(streamId: string): void {
    this.eventQueue.delete(streamId);
    this.lastEmitTimes.delete(streamId);

    const timer = this.throttleTimers.get(streamId);
    if (timer) {
      clearTimeout(timer);
      this.throttleTimers.delete(streamId);
    }
  }

  /**
   * Force flush all queued events for a stream
   */
  public async flushStreamEvents(streamId: string): Promise<void> {
    const events = this.eventQueue.get(streamId);
    if (events && events.length > 0) {
      for (const event of events) {
        await this.doEmit(event);
      }
      this.eventQueue.set(streamId, []);
    }
  }

  /**
   * Get queued events count for a stream
   */
  public getQueuedEventsCount(streamId: string): number {
    return this.eventQueue.get(streamId)?.length || 0;
  }

  /**
   * Validate event structure
   */
  private validateEvent(event: AnalyticsEvent): void {
    // Basic validation
    if (!event.streamId) {
      throw new Error('Event must have a streamId');
    }

    if (!event.timestamp) {
      throw new Error('Event must have a timestamp');
    }

    if (!event.type) {
      throw new Error('Event must have a type');
    }

    // Type-specific validation
    try {
      switch (event.type) {
        case 'analytics:stats:updated':
          statsUpdatedSchema.parse(event);
          break;
        // Add more specific validations as needed
        default:
          baseEventSchema.parse(event);
      }
    } catch (validationError) {
      throw new Error(
        `Event validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
      );
    }
  }

  /**
   * Determine event priority
   */
  private getEventPriority(event: AnalyticsEvent): keyof ThrottleConfig['priorities'] {
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

      case 'analytics:milestone:reached':
        const milestone = (event as MilestoneReachedEvent).milestone;
        return milestone.significance === 'record' ? 'high' : 'medium';

      case 'analytics:viewer:joined':
      case 'analytics:viewer:left':
        return 'low';

      case 'analytics:stats:updated':
        const stats = event as StatsUpdatedEvent;
        return stats.interval === 'realtime' ? 'medium' : 'low';

      default:
        return 'medium';
    }
  }

  /**
   * Apply throttling and queue events
   */
  private throttleAndEmit(
    event: AnalyticsEvent,
    priority: keyof ThrottleConfig['priorities'],
  ): boolean {
    const { streamId, type } = event;

    // Initialize maps if needed
    if (!this.eventQueue.has(streamId)) {
      this.eventQueue.set(streamId, []);
    }
    if (!this.lastEmitTimes.has(streamId)) {
      this.lastEmitTimes.set(streamId, new Map());
    }

    const streamQueue = this.eventQueue.get(streamId)!;
    const streamEmitTimes = this.lastEmitTimes.get(streamId)!;

    // Check if we should emit immediately based on time
    const lastEmitTime = streamEmitTimes.get(type) || 0;
    const now = Date.now();
    const timeSinceLastEmit = now - lastEmitTime;
    const minInterval = this.getMinInterval(type);
    const maxDelay = this.throttleConfig.priorities[priority];

    if (timeSinceLastEmit >= minInterval || timeSinceLastEmit >= maxDelay) {
      // Emit immediately
      streamEmitTimes.set(type, now);
      return this.doEmit(event);
    } else {
      // Queue the event
      streamQueue.push(event);

      // Check batch size limits
      const batchLimit = this.getBatchLimit(type);
      if (streamQueue.length >= batchLimit) {
        this.processBatch(streamId);
      } else {
        // Schedule batch processing
        this.scheduleBatchProcessing(streamId, priority);
      }

      return true;
    }
  }

  /**
   * Get minimum interval between events of a type
   */
  private getMinInterval(eventType: string): number {
    if (eventType.includes('stats')) {
      return this.throttleConfig.intervals.realtime;
    }
    if (eventType.includes('alert') || eventType.includes('quality')) {
      return this.throttleConfig.intervals.alerts;
    }
    return this.throttleConfig.intervals.aggregated;
  }

  /**
   * Get batch size limit for event type
   */
  private getBatchLimit(eventType: string): number {
    if (eventType.includes('stats')) {
      return this.throttleConfig.batchSize.stats;
    }
    if (eventType.includes('viewer')) {
      return this.throttleConfig.batchSize.viewers;
    }
    if (eventType.includes('alert') || eventType.includes('quality')) {
      return this.throttleConfig.batchSize.alerts;
    }
    return this.throttleConfig.batchSize.stats;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(
    streamId: string,
    priority: keyof ThrottleConfig['priorities'],
  ): void {
    // Don't schedule if already scheduled
    if (this.throttleTimers.has(streamId)) {
      return;
    }

    const delay = this.throttleConfig.priorities[priority];
    const timer = setTimeout(() => {
      this.processBatch(streamId);
      this.throttleTimers.delete(streamId);
    }, delay);

    this.throttleTimers.set(streamId, timer);
  }

  /**
   * Process queued events as a batch
   */
  private async processBatch(streamId: string): Promise<void> {
    const events = this.eventQueue.get(streamId);
    if (!events || events.length === 0) {
      return;
    }

    // Group events by type and emit the most recent of each type
    const eventsByType = new Map<string, AnalyticsEvent>();
    for (const event of events) {
      eventsByType.set(event.type, event); // Overwrites with most recent
    }

    // Emit the events
    for (const event of eventsByType.values()) {
      await this.doEmit(event);

      // Update last emit time
      const streamEmitTimes = this.lastEmitTimes.get(streamId);
      if (streamEmitTimes) {
        streamEmitTimes.set(event.type, Date.now());
      }
    }

    // Clear the queue
    this.eventQueue.set(streamId, []);
  }

  /**
   * Actually emit the event
   */
  private doEmit(event: AnalyticsEvent): boolean {
    const result = this.emit(event.type, event);
    this.emit('*', event); // Wildcard for all events

    console.log(`📊 Analytics Event: ${event.type} for stream ${event.streamId}`);
    return result;
  }

  /**
   * Add event to history
   */
  private addToHistory(event: AnalyticsEvent): void {
    if (!this.eventHistory.has(event.streamId)) {
      this.eventHistory.set(event.streamId, []);
    }

    const streamHistory = this.eventHistory.get(event.streamId)!;
    streamHistory.push(event);

    // Trim history if too long
    if (streamHistory.length > this.maxHistoryPerStream) {
      streamHistory.splice(0, streamHistory.length - this.maxHistoryPerStream);
    }
  }

  /**
   * Helper methods for common events
   */

  public async emitStatsUpdated(
    streamId: string,
    stats: StatsUpdatedEvent['stats'],
    interval: StatsUpdatedEvent['interval'] = 'realtime',
    source: BaseAnalyticsEvent['source'] = 'vdo_ninja',
  ): Promise<boolean> {
    return this.emitAnalyticsEvent({
      type: 'analytics:stats:updated',
      streamId,
      timestamp: new Date().toISOString(),
      source,
      stats,
      interval,
    });
  }

  public async emitViewerJoined(
    streamId: string,
    viewer: ViewerAnalyticsEvent['viewer'],
    aggregated: ViewerAnalyticsEvent['aggregated'],
  ): Promise<boolean> {
    return this.emitAnalyticsEvent({
      type: 'analytics:viewer:joined',
      streamId,
      timestamp: new Date().toISOString(),
      source: 'socket',
      viewer,
      aggregated,
    });
  }

  public async emitQualityChanged(
    streamId: string,
    quality: QualityAnalyticsEvent['quality'],
    alerts: QualityAnalyticsEvent['alerts'] = [],
  ): Promise<boolean> {
    return this.emitAnalyticsEvent({
      type: 'analytics:quality:changed',
      streamId,
      timestamp: new Date().toISOString(),
      source: 'vdo_ninja',
      quality,
      alerts,
    });
  }

  public async emitPerformanceAlert(
    streamId: string,
    alert: PerformanceAlertEvent['alert'],
  ): Promise<boolean> {
    return this.emitAnalyticsEvent({
      type: 'analytics:performance:alert',
      streamId,
      timestamp: new Date().toISOString(),
      source: 'computed',
      alert,
    });
  }
}

// Export singleton instance
export const analyticsEventEmitter = AnalyticsEventEmitter.getInstance();
