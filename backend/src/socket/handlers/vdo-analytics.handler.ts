import { Socket } from 'socket.io';
import { container } from 'tsyringe';
import { AnalyticsService } from '@/features/analytics/services/analytics.service';
import type {
  VdoStreamEvent,
  VdoStatsEvent,
  VdoViewerEvent,
  VdoMediaEvent,
  VdoQualityEvent,
  VdoRecordingEvent,
  VDO_SOCKET_EVENTS
} from '../types/vdo-events.types';

/**
 * VDO.Ninja Analytics Socket Handler
 * Processes real-time analytics events from VDO.Ninja integration
 */
export class VdoAnalyticsHandler {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = container.resolve(AnalyticsService);
  }

  /**
   * Register event handlers for a socket connection
   */
  registerHandlers(socket: Socket) {
    // Stream events
    socket.on(VDO_SOCKET_EVENTS.STREAM_EVENT, (data: VdoStreamEvent) =>
      this.handleStreamEvent(socket, data)
    );

    // Stats updates
    socket.on(VDO_SOCKET_EVENTS.STATS_UPDATE, (data: VdoStatsEvent) =>
      this.handleStatsUpdate(socket, data)
    );

    // Viewer events
    socket.on(VDO_SOCKET_EVENTS.VIEWER_EVENT, (data: VdoViewerEvent) =>
      this.handleViewerEvent(socket, data)
    );

    // Media events
    socket.on(VDO_SOCKET_EVENTS.MEDIA_EVENT, (data: VdoMediaEvent) =>
      this.handleMediaEvent(socket, data)
    );

    // Quality events
    socket.on(VDO_SOCKET_EVENTS.QUALITY_EVENT, (data: VdoQualityEvent) =>
      this.handleQualityEvent(socket, data)
    );

    // Recording events
    socket.on(VDO_SOCKET_EVENTS.RECORDING_EVENT, (data: VdoRecordingEvent) =>
      this.handleRecordingEvent(socket, data)
    );

    // Analytics requests
    socket.on(VDO_SOCKET_EVENTS.GET_ANALYTICS, (data: any) =>
      this.handleGetAnalytics(socket, data)
    );
  }

  /**
   * Handle stream lifecycle events
   */
  private async handleStreamEvent(socket: Socket, data: VdoStreamEvent) {
    try {
      const { streamId, action, timestamp } = data;

      // Log the event
      console.log(`Stream event: ${action} for stream ${streamId}`);

      // Broadcast event to room
      socket.to(`stream:${streamId}`).emit(VDO_SOCKET_EVENTS.STREAM_LIVE, {
        streamId,
        action,
        timestamp
      });

      // Send acknowledgment
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: true,
        event: 'stream',
        action
      });
    } catch (error) {
      console.error('Error handling stream event:', error);
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: false,
        error: 'Failed to process stream event'
      });
    }
  }

  /**
   * Handle real-time statistics updates
   */
  private async handleStatsUpdate(socket: Socket, data: VdoStatsEvent) {
    try {
      const { streamId, stats, timestamp } = data;

      // Process and store statistics
      await this.analyticsService.processRealtimeStats(streamId, {
        ...stats,
        viewerCount: stats.viewerCount || socket.adapter.rooms.get(`stream:${streamId}`)?.size || 0
      });

      // Check for quality issues
      const issues = this.detectQualityIssues(stats);
      if (issues.length > 0) {
        socket.emit(VDO_SOCKET_EVENTS.QUALITY_ISSUES, {
          streamId,
          issues,
          timestamp
        });
      }

      // Send acknowledgment
      socket.emit(VDO_SOCKET_EVENTS.STATS_ACK, {
        success: true,
        processed: true
      });
    } catch (error) {
      console.error('Error handling stats update:', error);
      socket.emit(VDO_SOCKET_EVENTS.STATS_ACK, {
        success: false,
        error: 'Failed to process statistics'
      });
    }
  }

  /**
   * Handle viewer join/leave events
   */
  private async handleViewerEvent(socket: Socket, data: VdoViewerEvent) {
    try {
      const { streamId, action, viewer, timestamp } = data;

      // Update viewer analytics
      await this.analyticsService.updateViewerAnalytics(
        streamId,
        viewer.id,
        action === 'joined' ? 'join' : action === 'left' ? 'leave' : 'update',
        {
          userId: viewer.username ? viewer.id : undefined,
          deviceInfo: {
            // Extract from user agent if available
            deviceType: this.detectDeviceType(socket.handshake.headers['user-agent'])
          },
          location: socket.handshake.headers['x-forwarded-for'] as string || socket.handshake.address
        }
      );

      // Broadcast viewer event to stream room
      socket.to(`stream:${streamId}`).emit(
        action === 'joined'
          ? VDO_SOCKET_EVENTS.VIEWER_JOINED
          : VDO_SOCKET_EVENTS.VIEWER_LEFT,
        {
          streamId,
          viewer,
          timestamp
        }
      );

      // Send acknowledgment
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: true,
        event: 'viewer',
        action
      });
    } catch (error) {
      console.error('Error handling viewer event:', error);
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: false,
        error: 'Failed to process viewer event'
      });
    }
  }

  /**
   * Handle media state change events
   */
  private async handleMediaEvent(socket: Socket, data: VdoMediaEvent) {
    try {
      const { streamId, action, timestamp } = data;

      // Broadcast media change to room
      socket.to(`stream:${streamId}`).emit(VDO_SOCKET_EVENTS.MEDIA_CHANGED, {
        streamId,
        action,
        timestamp
      });

      // Send acknowledgment
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: true,
        event: 'media',
        action
      });
    } catch (error) {
      console.error('Error handling media event:', error);
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: false,
        error: 'Failed to process media event'
      });
    }
  }

  /**
   * Handle quality change events
   */
  private async handleQualityEvent(socket: Socket, data: VdoQualityEvent) {
    try {
      const { streamId, action, quality, timestamp } = data;

      // Broadcast quality change to room
      socket.to(`stream:${streamId}`).emit(VDO_SOCKET_EVENTS.QUALITY_CHANGED, {
        streamId,
        action,
        quality,
        timestamp
      });

      // Send quality warning if needed
      if (quality.preset === 'low' || (quality.bitrate && quality.bitrate < 1000000)) {
        socket.emit(VDO_SOCKET_EVENTS.QUALITY_WARNING, {
          streamId,
          message: 'Low quality detected',
          quality,
          timestamp
        });
      }

      // Send acknowledgment
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: true,
        event: 'quality',
        action
      });
    } catch (error) {
      console.error('Error handling quality event:', error);
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: false,
        error: 'Failed to process quality event'
      });
    }
  }

  /**
   * Handle recording events
   */
  private async handleRecordingEvent(socket: Socket, data: VdoRecordingEvent) {
    try {
      const { streamId, action, recording, timestamp } = data;

      console.log(`Recording event: ${action} for stream ${streamId}`);

      // Send acknowledgment
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: true,
        event: 'recording',
        action
      });
    } catch (error) {
      console.error('Error handling recording event:', error);
      socket.emit(VDO_SOCKET_EVENTS.EVENT_ACK, {
        success: false,
        error: 'Failed to process recording event'
      });
    }
  }

  /**
   * Handle analytics data requests
   */
  private async handleGetAnalytics(socket: Socket, data: any) {
    try {
      const { streamId, period = '5minutes' } = data;

      const analytics = await this.analyticsService.getStreamAnalytics(streamId, {
        intervalType: period,
        includeRealtime: true,
        includeQualityEvents: true,
        includeViewerStats: true
      });

      socket.emit(VDO_SOCKET_EVENTS.ANALYTICS_DATA, {
        streamId,
        period,
        analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      socket.emit(VDO_SOCKET_EVENTS.ANALYTICS_DATA, {
        error: 'Failed to fetch analytics'
      });
    }
  }

  /**
   * Detect quality issues from stats
   */
  private detectQualityIssues(stats: any): string[] {
    const issues: string[] = [];

    if (stats.fps?.current && stats.fps.current < 20) {
      issues.push(`Low FPS: ${stats.fps.current}`);
    }

    if (stats.packetLoss && stats.packetLoss > 5) {
      issues.push(`High packet loss: ${stats.packetLoss.toFixed(1)}%`);
    }

    if (stats.latency && stats.latency > 500) {
      issues.push(`High latency: ${stats.latency}ms`);
    }

    if (stats.connectionQuality === 'poor' || stats.connectionQuality === 'critical') {
      issues.push(`Poor connection quality: ${stats.connectionQuality}`);
    }

    return issues;
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';

    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    if (/desktop/i.test(userAgent) || /windows|mac|linux/i.test(userAgent)) return 'desktop';
    
    return 'unknown';
  }
}

export const vdoAnalyticsHandler = new VdoAnalyticsHandler();