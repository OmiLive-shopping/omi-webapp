import { SocketServer } from '../../../config/socket/socket.config.js';
import { RoomManager } from '../../../socket/managers/room.manager.js';
import {
  type ProductFeaturedEvent,
  type QualityChangedEvent,
  type StatsUpdatedEvent,
  type StreamCreatedEvent,
  type StreamEndedEvent,
  type StreamErrorEvent,
  type StreamEvent,
  streamEventEmitter,
  type StreamEventType,
  type StreamStartedEvent,
  type StreamUpdatedEvent,
  type ViewerJoinedEvent,
  type ViewerLeftEvent,
} from './stream-event-emitter.js';

/**
 * Socket integration for stream events
 * Converts internal stream events to WebSocket emissions
 */
export class StreamSocketIntegration {
  private static instance: StreamSocketIntegration;
  private socketServer: SocketServer;
  private roomManager: RoomManager;
  private isInitialized = false;

  private constructor() {
    this.socketServer = SocketServer.getInstance();
    this.roomManager = RoomManager.getInstance();
  }

  public static getInstance(): StreamSocketIntegration {
    if (!StreamSocketIntegration.instance) {
      StreamSocketIntegration.instance = new StreamSocketIntegration();
    }
    return StreamSocketIntegration.instance;
  }

  /**
   * Initialize socket integration by setting up event listeners
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('StreamSocketIntegration already initialized');
      return;
    }

    console.log('🔌 Initializing Stream Socket Integration');

    // Listen to all stream events
    streamEventEmitter.onStreamEvent('*', this.handleStreamEvent.bind(this));

    // Set up specific handlers for better performance
    streamEventEmitter.onStreamEvent('stream:created', this.handleStreamCreated.bind(this));
    streamEventEmitter.onStreamEvent('stream:started', this.handleStreamStarted.bind(this));
    streamEventEmitter.onStreamEvent('stream:ended', this.handleStreamEnded.bind(this));
    streamEventEmitter.onStreamEvent('stream:updated', this.handleStreamUpdated.bind(this));
    streamEventEmitter.onStreamEvent('stream:viewer:joined', this.handleViewerJoined.bind(this));
    streamEventEmitter.onStreamEvent('stream:viewer:left', this.handleViewerLeft.bind(this));
    streamEventEmitter.onStreamEvent(
      'stream:product:featured',
      this.handleProductFeatured.bind(this),
    );
    streamEventEmitter.onStreamEvent('stream:stats:updated', this.handleStatsUpdated.bind(this));
    streamEventEmitter.onStreamEvent(
      'stream:quality:changed',
      this.handleQualityChanged.bind(this),
    );
    streamEventEmitter.onStreamEvent('stream:error', this.handleStreamError.bind(this));

    this.isInitialized = true;
    console.log('✅ Stream Socket Integration initialized');
  }

  /**
   * Shutdown socket integration
   */
  public shutdown(): void {
    console.log('🔌 Shutting down Stream Socket Integration');
    streamEventEmitter.removeAllListeners();
    this.isInitialized = false;
  }

  /**
   * Generic stream event handler (for logging and debugging)
   */
  private handleStreamEvent(event: StreamEvent): void {
    console.log(`📡 Broadcasting stream event: ${event.type} for stream ${event.streamId}`);

    // Update metrics or analytics here if needed
    this.updateEventMetrics(event);
  }

  /**
   * Handle stream created events
   */
  private handleStreamCreated(event: StreamCreatedEvent): void {
    // Notify all users that a new stream is available
    this.socketServer.getIO().emit('stream:created', {
      streamId: event.stream.id,
      title: event.stream.title,
      description: event.stream.description,
      thumbnailUrl: event.stream.thumbnailUrl,
      streamer: event.stream.user,
      scheduledFor: event.stream.scheduledFor,
      tags: event.stream.tags,
      timestamp: event.timestamp,
    });

    // Notify the streamer specifically
    this.socketServer.emitToUser(event.stream.userId, 'stream:created:own', {
      streamId: event.stream.id,
      title: event.stream.title,
      message: 'Your stream has been created successfully',
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle stream started events
   */
  private handleStreamStarted(event: StreamStartedEvent): void {
    // Create WebSocket room for the stream
    this.roomManager.createRoom(event.streamId);

    // Notify the streamer that their stream is live
    this.socketServer.emitToUser(event.stream.userId, 'stream:started', {
      streamId: event.stream.id,
      title: event.stream.title,
      vdoRoomId: event.stream.vdoRoomId,
      timestamp: event.timestamp,
    });

    // Broadcast to all users that stream is live
    this.socketServer.getIO().emit('stream:live', {
      streamId: event.stream.id,
      title: event.stream.title,
      streamer: event.stream.user,
      isLive: true,
      startedAt: event.stream.startedAt,
      timestamp: event.timestamp,
    });

    // Notify followers (if follower system exists)
    // this.notifyFollowers(event.stream.userId, event);
  }

  /**
   * Handle stream ended events
   */
  private handleStreamEnded(event: StreamEndedEvent): void {
    // Notify all viewers in the stream room
    this.socketServer.emitToRoom(`stream:${event.streamId}`, 'stream:ended', {
      streamId: event.streamId,
      endedAt: event.stream.endedAt,
      duration: event.stream.duration,
      finalViewerCount: event.stream.finalViewerCount,
      maxViewerCount: event.stream.maxViewerCount,
      reason: event.reason,
      message: this.getStreamEndMessage(event.reason),
      timestamp: event.timestamp,
    });

    // Broadcast globally that stream is offline
    this.socketServer.getIO().emit('stream:offline', {
      streamId: event.streamId,
      timestamp: event.timestamp,
    });

    // Clean up the WebSocket room
    setTimeout(() => {
      this.roomManager.cleanupStreamRoom(event.streamId);
    }, 5000); // 5 second delay to allow final messages
  }

  /**
   * Handle stream updated events
   */
  private handleStreamUpdated(event: StreamUpdatedEvent): void {
    // Notify all viewers in the stream room
    this.socketServer.emitToRoom(`stream:${event.streamId}`, 'stream:updated', {
      streamId: event.streamId,
      changes: event.changes,
      updatedBy: event.updatedBy,
      timestamp: event.timestamp,
    });

    // If title changed, notify globally for discovery updates
    if (event.changes.title) {
      this.socketServer.getIO().emit('stream:title:changed', {
        streamId: event.streamId,
        newTitle: event.changes.title,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle viewer joined events
   */
  private handleViewerJoined(event: ViewerJoinedEvent): void {
    // Notify others in the stream room (exclude the joiner)
    this.socketServer
      .getIO()
      .to(`stream:${event.streamId}`)
      .emit('stream:viewer:joined', {
        streamId: event.streamId,
        viewer: event.viewer.isAnonymous
          ? null
          : {
              id: event.viewer.id,
              username: event.viewer.username,
              avatarUrl: event.viewer.avatarUrl,
            },
        viewerCount: event.currentViewerCount,
        timestamp: event.timestamp,
      });

    // Update room viewer count
    this.socketServer.emitToRoom(
      `stream:${event.streamId}`,
      'stream:viewer-count',
      event.currentViewerCount,
    );

    // Notify the streamer with more details
    const stream = this.roomManager.getRoomInfo(event.streamId);
    if (stream?.creatorId) {
      this.socketServer.emitToUser(stream.creatorId, 'stream:viewer:joined:detailed', {
        streamId: event.streamId,
        viewer: event.viewer,
        viewerCount: event.currentViewerCount,
        connectionInfo: event.connectionInfo,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle viewer left events
   */
  private handleViewerLeft(event: ViewerLeftEvent): void {
    // Notify others in the stream room
    this.socketServer
      .getIO()
      .to(`stream:${event.streamId}`)
      .emit('stream:viewer:left', {
        streamId: event.streamId,
        viewer: event.viewer.id
          ? {
              id: event.viewer.id,
              username: event.viewer.username,
            }
          : null,
        viewerCount: event.currentViewerCount,
        timestamp: event.timestamp,
      });

    // Update room viewer count
    this.socketServer.emitToRoom(
      `stream:${event.streamId}`,
      'stream:viewer-count',
      event.currentViewerCount,
    );

    // Notify the streamer with viewer session details
    const stream = this.roomManager.getRoomInfo(event.streamId);
    if (stream?.creatorId && event.viewer.duration) {
      this.socketServer.emitToUser(stream.creatorId, 'stream:viewer:left:detailed', {
        streamId: event.streamId,
        viewer: event.viewer,
        viewerCount: event.currentViewerCount,
        sessionDuration: event.viewer.duration,
        reason: event.reason,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle product featured events
   */
  private handleProductFeatured(event: ProductFeaturedEvent): void {
    // Broadcast to all viewers in the stream
    this.socketServer.emitToRoom(`stream:${event.streamId}`, 'stream:product:featured', {
      streamId: event.streamId,
      product: event.product,
      featuredBy: event.featuredBy,
      duration: event.duration,
      position: event.position,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle stats updated events
   */
  private handleStatsUpdated(event: StatsUpdatedEvent): void {
    // Send stats to moderators and analytics dashboards
    this.socketServer.emitToRoom(`stream:${event.streamId}:moderators`, 'stream:stats:update', {
      streamId: event.streamId,
      stats: event.stats,
      source: event.source,
      timestamp: event.timestamp,
    });

    // Send viewer count to all viewers
    this.socketServer.emitToRoom(
      `stream:${event.streamId}`,
      'stream:viewer-count',
      event.stats.viewerCount,
    );

    // Send quality indicators to viewers if quality info is available
    if (event.stats.quality) {
      this.socketServer.emitToRoom(`stream:${event.streamId}`, 'stream:quality:indicator', {
        streamId: event.streamId,
        quality: event.stats.quality,
        metrics: {
          bitrate: event.stats.bitrate,
          fps: event.stats.fps,
          latency: event.stats.latency,
        },
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle quality changed events
   */
  private handleQualityChanged(event: QualityChangedEvent): void {
    // Notify all viewers about quality changes
    this.socketServer.emitToRoom(`stream:${event.streamId}`, 'stream:quality:changed', {
      streamId: event.streamId,
      quality: event.quality.level,
      metrics: event.quality.metrics,
      automaticAdjustment: event.automaticAdjustment,
      timestamp: event.timestamp,
    });

    // If quality is poor or critical, notify the streamer
    if (['poor', 'critical'].includes(event.quality.level)) {
      const stream = this.roomManager.getRoomInfo(event.streamId);
      if (stream?.creatorId) {
        this.socketServer.emitToUser(stream.creatorId, 'stream:quality:warning', {
          streamId: event.streamId,
          quality: event.quality,
          message: this.getQualityWarningMessage(event.quality.level),
          timestamp: event.timestamp,
        });
      }
    }
  }

  /**
   * Handle stream error events
   */
  private handleStreamError(event: StreamErrorEvent): void {
    // Notify the streamer about errors
    const stream = this.roomManager.getRoomInfo(event.streamId);
    if (stream?.creatorId) {
      this.socketServer.emitToUser(stream.creatorId, 'stream:error', {
        streamId: event.streamId,
        error: {
          code: event.error.code,
          message: event.error.message,
          severity: event.error.severity,
        },
        recovery: event.recovery,
        timestamp: event.timestamp,
      });
    }

    // For critical errors, notify moderators
    if (event.error.severity === 'critical') {
      this.socketServer.emitToRoom(`stream:${event.streamId}:moderators`, 'stream:error:critical', {
        streamId: event.streamId,
        error: event.error,
        recovery: event.recovery,
        timestamp: event.timestamp,
      });
    }

    // For network errors that might affect viewers, show a notice
    if (event.error.source === 'network' && ['high', 'critical'].includes(event.error.severity)) {
      this.socketServer.emitToRoom(`stream:${event.streamId}`, 'stream:connection:issue', {
        streamId: event.streamId,
        message: 'The stream is experiencing connection issues. Please be patient.',
        severity: event.error.severity,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Update event metrics for analytics
   */
  private updateEventMetrics(event: StreamEvent): void {
    // This could integrate with analytics services
    // For now, just log important events

    const importantEvents = [
      'stream:started',
      'stream:ended',
      'stream:viewer:joined',
      'stream:viewer:left',
      'stream:error',
    ];

    if (importantEvents.includes(event.type)) {
      console.log(`📊 Event Metric: ${event.type} at ${event.timestamp}`);
    }
  }

  /**
   * Get appropriate message for stream end reason
   */
  private getStreamEndMessage(reason?: string): string {
    switch (reason) {
      case 'manual':
        return 'The streamer has ended the stream';
      case 'timeout':
        return 'The stream has ended due to inactivity';
      case 'error':
        return 'The stream has ended due to technical issues';
      case 'server_shutdown':
        return 'The stream has ended due to server maintenance';
      default:
        return 'The stream has ended';
    }
  }

  /**
   * Get appropriate warning message for quality issues
   */
  private getQualityWarningMessage(quality: string): string {
    switch (quality) {
      case 'poor':
        return 'Your stream quality is poor. Consider reducing bitrate or checking your internet connection.';
      case 'critical':
        return 'Your stream quality is critical. Viewers may experience buffering. Please check your connection immediately.';
      default:
        return 'Stream quality has changed.';
    }
  }

  /**
   * Get room-specific socket emission utilities
   */
  public getStreamRoomEmitter(streamId: string) {
    return {
      toViewers: (event: string, data: any) => {
        this.socketServer.emitToRoom(`stream:${streamId}`, event, data);
      },
      toModerators: (event: string, data: any) => {
        this.socketServer.emitToRoom(`stream:${streamId}:moderators`, event, data);
      },
      toStreamer: (streamerId: string, event: string, data: any) => {
        this.socketServer.emitToUser(streamerId, event, data);
      },
      toAll: (event: string, data: any) => {
        this.socketServer.getIO().emit(event, data);
      },
    };
  }
}
