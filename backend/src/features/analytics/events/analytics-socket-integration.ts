import { 
  analyticsEventEmitter, 
  type AnalyticsEvent,
  type StatsUpdatedEvent,
  type ViewerAnalyticsEvent,
  type QualityAnalyticsEvent,
  type PerformanceAlertEvent,
  type MilestoneReachedEvent,
  type IntervalSummaryEvent,
} from './analytics-event-emitter.js';
import { SocketServer } from '../../../config/socket/socket.config.js';

/**
 * Socket integration for analytics events
 * Converts internal analytics events to WebSocket emissions
 */
export class AnalyticsSocketIntegration {
  private static instance: AnalyticsSocketIntegration;
  private socketServer: SocketServer;
  private isInitialized = false;

  private constructor() {
    this.socketServer = SocketServer.getInstance();
  }

  public static getInstance(): AnalyticsSocketIntegration {
    if (!AnalyticsSocketIntegration.instance) {
      AnalyticsSocketIntegration.instance = new AnalyticsSocketIntegration();
    }
    return AnalyticsSocketIntegration.instance;
  }

  /**
   * Initialize analytics socket integration
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('AnalyticsSocketIntegration already initialized');
      return;
    }

    console.log('🔌 Initializing Analytics Socket Integration');

    // Listen to all analytics events
    analyticsEventEmitter.onAnalyticsEvent('*', this.handleAnalyticsEvent.bind(this));

    // Set up specific handlers for better performance
    analyticsEventEmitter.onAnalyticsEvent('analytics:stats:updated', this.handleStatsUpdated.bind(this));
    analyticsEventEmitter.onAnalyticsEvent('analytics:viewer:joined', this.handleViewerAnalytics.bind(this));
    analyticsEventEmitter.onAnalyticsEvent('analytics:viewer:left', this.handleViewerAnalytics.bind(this));
    analyticsEventEmitter.onAnalyticsEvent('analytics:quality:changed', this.handleQualityChanged.bind(this));
    analyticsEventEmitter.onAnalyticsEvent('analytics:performance:alert', this.handlePerformanceAlert.bind(this));
    analyticsEventEmitter.onAnalyticsEvent('analytics:milestone:reached', this.handleMilestoneReached.bind(this));
    analyticsEventEmitter.onAnalyticsEvent('analytics:summary:interval', this.handleIntervalSummary.bind(this));

    this.isInitialized = true;
    console.log('✅ Analytics Socket Integration initialized');
  }

  /**
   * Shutdown analytics socket integration
   */
  public shutdown(): void {
    console.log('🔌 Shutting down Analytics Socket Integration');
    analyticsEventEmitter.removeAllListeners();
    this.isInitialized = false;
  }

  /**
   * Generic analytics event handler (for logging and debugging)
   */
  private handleAnalyticsEvent(event: AnalyticsEvent): void {
    console.log(`📊 Broadcasting analytics event: ${event.type} for stream ${event.streamId}`);
  }

  /**
   * Handle stats updated events
   */
  private handleStatsUpdated(event: StatsUpdatedEvent): void {
    const { streamId } = event;
    
    // Emit to analytics namespace subscribers
    this.emitToAnalyticsSubscribers(streamId, 'analytics:stats:realtime', {
      streamId,
      stats: event.stats,
      interval: event.interval,
      timestamp: event.timestamp,
      source: event.source,
    });

    // For realtime updates, also emit to main stream room for basic viewer count
    if (event.interval === 'realtime') {
      this.socketServer.emitToRoom(`stream:${streamId}`, 'stream:viewer-count', event.stats.currentViewers);
      
      // Emit quality indicator to viewers
      this.socketServer.emitToRoom(`stream:${streamId}`, 'stream:quality:indicator', {
        quality: event.stats.connectionQuality,
        score: event.stats.connectionScore,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle viewer analytics events
   */
  private handleViewerAnalytics(event: ViewerAnalyticsEvent): void {
    const { streamId } = event;
    
    // Emit detailed viewer analytics to analytics subscribers
    this.emitToAnalyticsSubscribers(streamId, `analytics:viewer:${event.type.split(':')[2]}`, {
      streamId,
      viewer: event.viewer,
      session: event.session,
      aggregated: event.aggregated,
      timestamp: event.timestamp,
    });

    // Emit aggregated viewer data to moderators
    this.socketServer.emitToRoom(`stream:${streamId}:moderators`, 'analytics:viewer:summary', {
      streamId,
      currentViewers: event.aggregated.currentViewers,
      totalViewers: event.aggregated.totalViewers,
      deviceBreakdown: event.aggregated.deviceBreakdown,
      locationBreakdown: event.aggregated.locationBreakdown,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle quality changed events
   */
  private handleQualityChanged(event: QualityAnalyticsEvent): void {
    const { streamId } = event;
    
    // Emit to analytics subscribers with full details
    this.emitToAnalyticsSubscribers(streamId, 'analytics:quality:changed', {
      streamId,
      quality: event.quality,
      alerts: event.alerts,
      timestamp: event.timestamp,
    });

    // Emit simplified quality change to all viewers
    this.socketServer.emitToRoom(`stream:${streamId}`, 'stream:quality:changed', {
      streamId,
      quality: event.quality.current,
      previousQuality: event.quality.previous,
      impact: event.quality.impact,
      timestamp: event.timestamp,
    });

    // If quality is poor or critical, notify the streamer
    if (['poor', 'critical'].includes(event.quality.current)) {
      // Get stream owner ID (would need to look this up)
      // this.socketServer.emitToUser(streamOwnerId, 'analytics:quality:warning', {...});
    }
  }

  /**
   * Handle performance alert events
   */
  private handlePerformanceAlert(event: PerformanceAlertEvent): void {
    const { streamId } = event;
    
    // Emit to analytics subscribers
    this.emitToAnalyticsSubscribers(streamId, 'analytics:alert:performance', {
      streamId,
      alert: event.alert,
      timestamp: event.timestamp,
    });

    // For critical alerts, notify moderators
    if (event.alert.level === 'critical') {
      this.socketServer.emitToRoom(`stream:${streamId}:moderators`, 'analytics:alert:critical', {
        streamId,
        title: event.alert.title,
        message: event.alert.message,
        category: event.alert.category,
        metrics: event.alert.metrics,
        timestamp: event.timestamp,
      });
    }

    // For technical issues that might affect viewers, show a subtle notice
    if (event.alert.category === 'technical' && ['error', 'critical'].includes(event.alert.level)) {
      this.socketServer.emitToRoom(`stream:${streamId}`, 'stream:technical:notice', {
        streamId,
        message: 'The streamer is experiencing technical difficulties. Please be patient.',
        level: event.alert.level,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle milestone reached events
   */
  private handleMilestoneReached(event: MilestoneReachedEvent): void {
    const { streamId } = event;
    
    // Emit to analytics subscribers with full details
    this.emitToAnalyticsSubscribers(streamId, 'analytics:milestone:reached', {
      streamId,
      milestone: event.milestone,
      celebration: event.celebration,
      timestamp: event.timestamp,
    });

    // Broadcast celebration to all viewers if enabled
    if (event.celebration) {
      this.socketServer.emitToRoom(`stream:${streamId}`, 'stream:milestone:celebration', {
        streamId,
        milestone: {
          name: event.milestone.name,
          value: event.milestone.value,
          unit: event.milestone.unit,
          significance: event.milestone.significance,
        },
        celebration: event.celebration,
        timestamp: event.timestamp,
      });
    }

    // For significant milestones, notify globally
    if (event.milestone.significance === 'record') {
      this.socketServer.getIO().emit('platform:milestone:record', {
        streamId,
        milestone: event.milestone.name,
        value: event.milestone.value,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle interval summary events
   */
  private handleIntervalSummary(event: IntervalSummaryEvent): void {
    const { streamId } = event;
    
    // Emit to analytics subscribers
    this.emitToAnalyticsSubscribers(streamId, 'analytics:summary:interval', {
      streamId,
      interval: event.interval,
      summary: event.summary,
      timestamp: event.timestamp,
    });

    // For hourly summaries, notify moderators
    if (event.interval.type === 'hour') {
      this.socketServer.emitToRoom(`stream:${streamId}:moderators`, 'analytics:summary:hourly', {
        streamId,
        summary: {
          viewers: event.summary.viewers,
          engagement: event.summary.engagement,
          technical: event.summary.technical,
        },
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Emit to analytics namespace subscribers for a stream
   */
  private emitToAnalyticsSubscribers(streamId: string, eventName: string, data: any): void {
    const io = this.socketServer.getIO();
    const analyticsNamespace = io.of('/analytics');
    
    analyticsNamespace.to(`analytics:${streamId}`).emit(eventName, data);
  }

  /**
   * Get analytics-specific socket emission utilities
   */
  public getAnalyticsEmitter(streamId: string) {
    return {
      toSubscribers: (event: string, data: any) => {
        this.emitToAnalyticsSubscribers(streamId, event, data);
      },
      toModerators: (event: string, data: any) => {
        this.socketServer.emitToRoom(`stream:${streamId}:moderators`, event, data);
      },
      toViewers: (event: string, data: any) => {
        this.socketServer.emitToRoom(`stream:${streamId}`, event, data);
      },
      toStreamer: (streamerId: string, event: string, data: any) => {
        this.socketServer.emitToUser(streamerId, event, data);
      },
      toGlobal: (event: string, data: any) => {
        this.socketServer.getIO().emit(event, data);
      },
    };
  }

  /**
   * Emit analytics dashboard update
   */
  public emitDashboardUpdate(streamId: string, metrics: any): void {
    this.emitToAnalyticsSubscribers(streamId, 'analytics:dashboard:update', {
      streamId,
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit analytics configuration update
   */
  public emitConfigurationUpdate(streamId: string, config: any): void {
    this.emitToAnalyticsSubscribers(streamId, 'analytics:config:updated', {
      streamId,
      config,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit subscription status update
   */
  public emitSubscriptionStatus(socketId: string, status: any): void {
    this.socketServer.getIO().to(socketId).emit('analytics:subscription:status', {
      status,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const analyticsSocketIntegration = AnalyticsSocketIntegration.getInstance();
