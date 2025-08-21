import { z } from 'zod';

import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';
import { SocketServer } from '../../config/socket/socket.config.js';
import { RoomManager } from '../managers/room.manager.js';
import type { VdoQualityEvent, VdoStreamEvent, VdoViewerEvent } from '../types/vdo-events.types.js';
import { ChatHandler } from './chat.handler.js';

// VDO.Ninja Event Schemas
const vdoStreamEventSchema = z.object({
  streamId: z.string().uuid(),
  action: z.string(),
  data: z.any().optional(),
  timestamp: z.string().datetime(),
});

const vdoStatsEventSchema = z.object({
  streamId: z.string().uuid(),
  stats: z.object({
    // Video stats
    fps: z
      .object({
        current: z.number(),
        average: z.number(),
        min: z.number(),
        max: z.number(),
      })
      .optional(),
    resolution: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional(),

    // Network stats
    bitrate: z.number().optional(),
    latency: z.number().optional(),
    packetLoss: z.number().optional(),
    jitter: z.number().optional(),

    // Audio stats
    audioLevel: z.number().optional(),
    audioDropouts: z.number().optional(),

    // Connection stats
    connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).optional(),
    connectionScore: z.number().min(0).max(100).optional(),

    // Data usage
    bytesSent: z.number().optional(),
    bytesReceived: z.number().optional(),
    uploadSpeed: z.number().optional(),
    downloadSpeed: z.number().optional(),
  }),
  timestamp: z.string().datetime(),
});

const vdoViewerEventSchema = z.object({
  streamId: z.string().uuid(),
  action: z.enum(['joined', 'left', 'reconnected', 'disconnected']),
  viewer: z.object({
    id: z.string(),
    username: z.string().optional(),
    connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).optional(),
    joinTime: z.string().datetime().optional(),
  }),
  timestamp: z.string().datetime(),
});

const vdoMediaEventSchema = z.object({
  streamId: z.string().uuid(),
  action: z.enum([
    'audioMuted',
    'audioUnmuted',
    'videoHidden',
    'videoShown',
    'screenShareStarted',
    'screenShareEnded',
  ]),
  timestamp: z.string().datetime(),
});

const vdoQualityEventSchema = z.object({
  streamId: z.string().uuid(),
  action: z.enum(['qualityChanged', 'bitrateChanged', 'resolutionChanged', 'framerateChanged']),
  quality: z.object({
    preset: z.enum(['low', 'medium', 'high', 'ultra']).optional(),
    bitrate: z.number().optional(),
    resolution: z.string().optional(),
    framerate: z.number().optional(),
  }),
  timestamp: z.string().datetime(),
});

const vdoRecordingEventSchema = z.object({
  streamId: z.string().uuid(),
  action: z.enum(['recordingStarted', 'recordingStopped', 'recordingPaused', 'recordingResumed']),
  recording: z
    .object({
      id: z.string().optional(),
      duration: z.number().optional(),
      size: z.number().optional(),
      format: z.string().optional(),
    })
    .optional(),
  timestamp: z.string().datetime(),
});

// Analytics aggregation schema
const vdoAnalyticsSchema = z.object({
  streamId: z.string().uuid(),
  period: z.enum(['minute', '5minutes', '15minutes', 'hour']),
  analytics: z.object({
    averageFps: z.number(),
    averageBitrate: z.number(),
    averageLatency: z.number(),
    averagePacketLoss: z.number(),
    peakViewers: z.number(),
    totalViewers: z.number(),
    averageViewDuration: z.number(),
    connectionQualityDistribution: z.object({
      excellent: z.number(),
      good: z.number(),
      fair: z.number(),
      poor: z.number(),
      critical: z.number(),
    }),
  }),
  timestamp: z.string().datetime(),
});

export class VdoStreamHandler {
  private roomManager = RoomManager.getInstance();
  private socketServer = SocketServer.getInstance();
  private prisma = PrismaService.getInstance().client;
  private chatHandler = new ChatHandler();

  // In-memory storage for real-time stats
  private streamStats: Map<string, any> = new Map();
  private streamAnalytics: Map<string, any[]> = new Map();
  private lastAnalyticsUpdate: Map<string, number> = new Map();

  /**
   * Handle VDO.Ninja stream events
   */
  handleVdoStreamEvent = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = vdoStreamEventSchema.parse(data);

      // Verify stream ownership
      const stream = await this.verifyStreamOwnership(validated.streamId, socket.userId);
      if (!stream) {
        socket.emit('error', { message: 'Unauthorized to send stream events' });
        return;
      }

      // Send VDO event to chat handler for system messages
      const vdoEvent: VdoStreamEvent = {
        streamId: validated.streamId,
        action: validated.action as any,
        timestamp: validated.timestamp,
      };
      await this.chatHandler.handleVdoStreamEvent(vdoEvent);

      // Process different event types
      switch (validated.action) {
        case 'streamStarted':
        case 'stream-started':
          await this.handleStreamStarted(socket, validated);
          break;
        case 'streamEnded':
        case 'stream-stopped':
          await this.handleStreamEnded(socket, validated);
          break;
        case 'streamPaused':
        case 'stream-paused':
          await this.handleStreamPaused(socket, validated);
          break;
        case 'streamResumed':
          await this.handleStreamResumed(socket, validated);
          break;
        case 'streamError':
          await this.handleStreamError(socket, validated);
          break;
        default:
          // Forward unknown events to room
          this.socketServer.emitToRoom(`stream:${validated.streamId}`, 'vdo:event', validated);
      }

      // Acknowledge receipt
      socket.emit('vdo:event:ack', {
        streamId: validated.streamId,
        action: validated.action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid VDO event data', errors: error.errors });
      } else {
        console.error('Error handling VDO stream event:', error);
        socket.emit('error', { message: 'Failed to process VDO event' });
      }
    }
  };

  /**
   * Handle VDO.Ninja statistics updates
   */
  handleVdoStatsUpdate = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = vdoStatsEventSchema.parse(data);

      // Verify stream ownership
      const stream = await this.verifyStreamOwnership(validated.streamId, socket.userId);
      if (!stream) {
        socket.emit('error', { message: 'Unauthorized to update stats' });
        return;
      }

      // Store stats in memory
      this.streamStats.set(validated.streamId, {
        ...validated.stats,
        lastUpdated: new Date(validated.timestamp),
      });

      // Update room manager stats
      const roomInfo = this.roomManager.getRoomInfo(validated.streamId);
      if (roomInfo) {
        roomInfo.streamStats = validated.stats;
      }

      // Broadcast stats to moderators and analytics viewers
      this.socketServer.emitToRoom(`stream:${validated.streamId}:moderators`, 'vdo:stats:update', {
        streamId: validated.streamId,
        stats: validated.stats,
        timestamp: validated.timestamp,
      });

      // Aggregate analytics periodically
      await this.aggregateAnalytics(validated.streamId, validated.stats);

      // Check for quality issues and alert
      this.checkQualityIssues(socket, validated.streamId, validated.stats);

      // Store in database periodically (every 30 seconds)
      const now = Date.now();
      const lastUpdate = this.lastAnalyticsUpdate.get(validated.streamId) || 0;
      if (now - lastUpdate > 30000) {
        await this.storeAnalytics(validated.streamId, validated.stats);
        this.lastAnalyticsUpdate.set(validated.streamId, now);
      }

      // Acknowledge receipt
      socket.emit('vdo:stats:ack', {
        streamId: validated.streamId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid stats data', errors: error.errors });
      } else {
        console.error('Error handling VDO stats:', error);
        socket.emit('error', { message: 'Failed to process stats' });
      }
    }
  };

  /**
   * Handle VDO.Ninja viewer events
   */
  handleVdoViewerEvent = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = vdoViewerEventSchema.parse(data);

      // Send viewer event to chat handler for system messages
      const vdoEvent: VdoViewerEvent = {
        streamId: validated.streamId,
        action: validated.action,
        viewer: validated.viewer,
        timestamp: validated.timestamp,
      };
      await this.chatHandler.handleVdoViewerEvent(vdoEvent);

      // Process viewer events
      switch (validated.action) {
        case 'joined':
          await this.handleViewerJoined(socket, validated);
          break;
        case 'left':
          await this.handleViewerLeft(socket, validated);
          break;
        case 'reconnected':
          await this.handleViewerReconnected(socket, validated);
          break;
        case 'disconnected':
          await this.handleViewerDisconnected(socket, validated);
          break;
      }

      // Broadcast to stream room
      this.socketServer.emitToRoom(`stream:${validated.streamId}`, 'vdo:viewer:event', {
        action: validated.action,
        viewer: validated.viewer,
        viewerCount: this.roomManager.getViewerCount(validated.streamId),
        timestamp: validated.timestamp,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid viewer event data', errors: error.errors });
      } else {
        console.error('Error handling VDO viewer event:', error);
        socket.emit('error', { message: 'Failed to process viewer event' });
      }
    }
  };

  /**
   * Handle VDO.Ninja media control events
   */
  handleVdoMediaEvent = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = vdoMediaEventSchema.parse(data);

      // Verify stream ownership
      const stream = await this.verifyStreamOwnership(validated.streamId, socket.userId);
      if (!stream) {
        socket.emit('error', { message: 'Unauthorized to send media events' });
        return;
      }

      // Update stream state based on media event
      const roomInfo = this.roomManager.getRoomInfo(validated.streamId);
      if (roomInfo && roomInfo.streamStats) {
        switch (validated.action) {
          case 'audioMuted':
            roomInfo.streamStats.isAudioMuted = true;
            break;
          case 'audioUnmuted':
            roomInfo.streamStats.isAudioMuted = false;
            break;
          case 'videoHidden':
            roomInfo.streamStats.isVideoHidden = true;
            break;
          case 'videoShown':
            roomInfo.streamStats.isVideoHidden = false;
            break;
          case 'screenShareStarted':
            roomInfo.streamStats.isScreenSharing = true;
            break;
          case 'screenShareEnded':
            roomInfo.streamStats.isScreenSharing = false;
            break;
        }
      }

      // Broadcast to all viewers
      this.socketServer.emitToRoom(`stream:${validated.streamId}`, 'vdo:media:event', {
        action: validated.action,
        timestamp: validated.timestamp,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid media event data', errors: error.errors });
      } else {
        console.error('Error handling VDO media event:', error);
        socket.emit('error', { message: 'Failed to process media event' });
      }
    }
  };

  /**
   * Handle VDO.Ninja quality change events
   */
  handleVdoQualityEvent = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = vdoQualityEventSchema.parse(data);

      // Verify stream ownership
      const stream = await this.verifyStreamOwnership(validated.streamId, socket.userId);
      if (!stream) {
        socket.emit('error', { message: 'Unauthorized to change quality' });
        return;
      }

      // Send quality event to chat handler for system messages
      const vdoEvent: VdoQualityEvent = {
        streamId: validated.streamId,
        action: validated.action as any,
        quality: validated.quality,
        timestamp: validated.timestamp,
      };
      await this.chatHandler.handleVdoQualityEvent(vdoEvent);

      // Update stream quality settings
      const roomInfo = this.roomManager.getRoomInfo(validated.streamId);
      if (roomInfo && roomInfo.streamStats) {
        roomInfo.streamStats.qualitySettings = validated.quality;
      }

      // Broadcast to viewers
      this.socketServer.emitToRoom(`stream:${validated.streamId}`, 'vdo:quality:changed', {
        quality: validated.quality,
        timestamp: validated.timestamp,
      });

      // Log quality changes for analytics
      console.log(`Stream ${validated.streamId} quality changed:`, validated.quality);
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid quality event data', errors: error.errors });
      } else {
        console.error('Error handling VDO quality event:', error);
        socket.emit('error', { message: 'Failed to process quality event' });
      }
    }
  };

  /**
   * Handle VDO.Ninja recording events
   */
  handleVdoRecordingEvent = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = vdoRecordingEventSchema.parse(data);

      // Verify stream ownership
      const stream = await this.verifyStreamOwnership(validated.streamId, socket.userId);
      if (!stream) {
        socket.emit('error', { message: 'Unauthorized to manage recording' });
        return;
      }

      // Update recording state
      const roomInfo = this.roomManager.getRoomInfo(validated.streamId);
      if (roomInfo && roomInfo.streamStats) {
        switch (validated.action) {
          case 'recordingStarted':
            roomInfo.streamStats.isRecording = true;
            roomInfo.streamStats.recordingStartTime = validated.timestamp;
            break;
          case 'recordingStopped':
            roomInfo.streamStats.isRecording = false;
            roomInfo.streamStats.recordingEndTime = validated.timestamp;
            break;
          case 'recordingPaused':
            roomInfo.streamStats.isRecordingPaused = true;
            break;
          case 'recordingResumed':
            roomInfo.streamStats.isRecordingPaused = false;
            break;
        }
      }

      // Store recording info in database
      if (validated.action === 'recordingStopped' && validated.recording) {
        await this.storeRecordingInfo(validated.streamId, validated.recording);
      }

      // Broadcast to moderators
      this.socketServer.emitToRoom(
        `stream:${validated.streamId}:moderators`,
        'vdo:recording:event',
        {
          action: validated.action,
          recording: validated.recording,
          timestamp: validated.timestamp,
        },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid recording event data', errors: error.errors });
      } else {
        console.error('Error handling VDO recording event:', error);
        socket.emit('error', { message: 'Failed to process recording event' });
      }
    }
  };

  /**
   * Get aggregated analytics for a stream
   */
  handleGetVdoAnalytics = async (
    socket: SocketWithAuth,
    data: { streamId: string; period?: string },
  ) => {
    try {
      // Verify stream ownership or moderator status
      const stream = await this.prisma.stream.findUnique({
        where: { id: data.streamId },
        select: { userId: true },
      });

      if (!stream) {
        socket.emit('error', { message: 'Stream not found' });
        return;
      }

      const isModerator = this.roomManager.isModerator(data.streamId, socket.userId || '');
      if (stream.userId !== socket.userId && !isModerator) {
        socket.emit('error', { message: 'Unauthorized to view analytics' });
        return;
      }

      // Get current stats
      const currentStats = this.streamStats.get(data.streamId);

      // Get aggregated analytics
      const analytics = this.streamAnalytics.get(data.streamId) || [];
      const period = data.period || '5minutes';
      const filteredAnalytics = analytics.filter((a: any) => a.period === period);

      // Get viewer breakdown
      const roomInfo = this.roomManager.getRoomInfo(data.streamId);
      const viewers = roomInfo ? Array.from(roomInfo.viewers.values()) : [];

      socket.emit('vdo:analytics', {
        streamId: data.streamId,
        currentStats,
        aggregatedAnalytics: filteredAnalytics.slice(-20), // Last 20 data points
        viewers: {
          current: viewers.length,
          authenticated: viewers.filter(v => v.userId).length,
          anonymous: viewers.filter(v => !v.userId).length,
          list: viewers.map(v => ({
            userId: v.userId,
            username: v.username,
            joinedAt: v.joinedAt,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting VDO analytics:', error);
      socket.emit('error', { message: 'Failed to get analytics' });
    }
  };

  // Helper methods

  private async verifyStreamOwnership(streamId: string, userId?: string): Promise<any> {
    if (!userId) return null;

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { userId: true, isLive: true },
    });

    return stream && stream.userId === userId ? stream : null;
  }

  private async handleStreamStarted(socket: SocketWithAuth, event: any) {
    const { streamId } = event;

    // Update stream status
    await this.prisma.stream.update({
      where: { id: streamId },
      data: {
        isLive: true,
        startedAt: new Date(),
      },
    });

    // Create room
    await this.roomManager.createRoom(streamId);

    // Notify all users
    this.socketServer.getIO().emit('vdo:stream:live', {
      streamId,
      timestamp: event.timestamp,
    });
  }

  private async handleStreamEnded(socket: SocketWithAuth, event: any) {
    const { streamId } = event;

    // Save final analytics
    const stats = this.streamStats.get(streamId);
    if (stats) {
      await this.storeAnalytics(streamId, stats);
    }

    // Update stream status
    await this.prisma.stream.update({
      where: { id: streamId },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });

    // Notify viewers
    this.socketServer.emitToRoom(`stream:${streamId}`, 'vdo:stream:ended', {
      streamId,
      timestamp: event.timestamp,
    });

    // Clean up
    this.streamStats.delete(streamId);
    this.streamAnalytics.delete(streamId);
    this.lastAnalyticsUpdate.delete(streamId);
  }

  private async handleStreamPaused(socket: SocketWithAuth, event: any) {
    const { streamId } = event;

    // Update room info
    const roomInfo = this.roomManager.getRoomInfo(streamId);
    if (roomInfo && roomInfo.streamStats) {
      roomInfo.streamStats.isPaused = true;
    }

    // Notify viewers
    this.socketServer.emitToRoom(`stream:${streamId}`, 'vdo:stream:paused', {
      streamId,
      timestamp: event.timestamp,
    });
  }

  private async handleStreamResumed(socket: SocketWithAuth, event: any) {
    const { streamId } = event;

    // Update room info
    const roomInfo = this.roomManager.getRoomInfo(streamId);
    if (roomInfo && roomInfo.streamStats) {
      roomInfo.streamStats.isPaused = false;
    }

    // Notify viewers
    this.socketServer.emitToRoom(`stream:${streamId}`, 'vdo:stream:resumed', {
      streamId,
      timestamp: event.timestamp,
    });
  }

  private async handleStreamError(socket: SocketWithAuth, event: any) {
    const { streamId, data } = event;

    console.error(`Stream error for ${streamId}:`, data);

    // Notify moderators
    this.socketServer.emitToRoom(`stream:${streamId}:moderators`, 'vdo:stream:error', {
      streamId,
      error: data,
      timestamp: event.timestamp,
    });
  }

  private async handleViewerJoined(socket: SocketWithAuth, event: any) {
    const { streamId, viewer } = event;

    // Track viewer in database
    if (viewer.id) {
      await this.prisma.streamViewer
        .create({
          data: {
            streamId,
            userId: viewer.id,
            sessionId: socket.id,
          },
        })
        .catch(() => {}); // Ignore duplicate errors
    }

    // Update viewer count
    await this.prisma.stream.update({
      where: { id: streamId },
      data: {
        viewerCount: this.roomManager.getViewerCount(streamId),
        totalViewers: {
          increment: 1,
        },
      },
    });
  }

  private async handleViewerLeft(socket: SocketWithAuth, event: any) {
    const { streamId, viewer } = event;

    // Update viewer record
    if (viewer.id) {
      await this.prisma.streamViewer.updateMany({
        where: {
          streamId,
          userId: viewer.id,
          leftAt: null,
        },
        data: {
          leftAt: new Date(),
        },
      });
    }

    // Update viewer count
    await this.prisma.stream.update({
      where: { id: streamId },
      data: {
        viewerCount: this.roomManager.getViewerCount(streamId),
      },
    });
  }

  private async handleViewerReconnected(socket: SocketWithAuth, event: any) {
    const { streamId, viewer } = event;

    console.log(`Viewer ${viewer.id} reconnected to stream ${streamId}`);

    // Update connection quality if provided
    if (viewer.connectionQuality) {
      const roomInfo = this.roomManager.getRoomInfo(streamId);
      if (roomInfo) {
        const viewerInfo = roomInfo.viewers.get(socket.id);
        if (viewerInfo) {
          // Store connection quality for analytics
        }
      }
    }
  }

  private async handleViewerDisconnected(socket: SocketWithAuth, event: any) {
    const { streamId, viewer } = event;

    console.log(`Viewer ${viewer.id} disconnected from stream ${streamId}`);

    // Mark as temporarily disconnected (may reconnect)
  }

  private async aggregateAnalytics(streamId: string, stats: any) {
    const analytics = this.streamAnalytics.get(streamId) || [];

    // Add current stats to analytics history
    analytics.push({
      timestamp: new Date(),
      ...stats,
    });

    // Keep only last hour of data
    const oneHourAgo = Date.now() - 3600000;
    const filteredAnalytics = analytics.filter((a: any) => a.timestamp.getTime() > oneHourAgo);

    this.streamAnalytics.set(streamId, filteredAnalytics);

    // Calculate aggregates for different time periods
    const now = Date.now();
    const periods = [
      { name: 'minute', duration: 60000 },
      { name: '5minutes', duration: 300000 },
      { name: '15minutes', duration: 900000 },
    ];

    for (const period of periods) {
      const periodData = filteredAnalytics.filter(
        (a: any) => a.timestamp.getTime() > now - period.duration,
      );

      if (periodData.length > 0) {
        const aggregate = this.calculateAggregate(periodData);

        // Emit aggregated analytics
        this.socketServer.emitToRoom(`stream:${streamId}:moderators`, 'vdo:analytics:aggregate', {
          streamId,
          period: period.name,
          analytics: aggregate,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private calculateAggregate(data: any[]): any {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => (arr.length > 0 ? sum(arr) / arr.length : 0);

    return {
      averageFps: avg(data.map(d => d.fps?.current || 0).filter(v => v > 0)),
      averageBitrate: avg(data.map(d => d.bitrate || 0).filter(v => v > 0)),
      averageLatency: avg(data.map(d => d.latency || 0).filter(v => v > 0)),
      averagePacketLoss: avg(data.map(d => d.packetLoss || 0)),
      minFps: Math.min(...data.map(d => d.fps?.min || 30).filter(v => v > 0)),
      maxFps: Math.max(...data.map(d => d.fps?.max || 30)),
      dataPoints: data.length,
    };
  }

  private checkQualityIssues(socket: SocketWithAuth, streamId: string, stats: any) {
    const issues: string[] = [];

    // Check for quality issues
    if (stats.fps?.current && stats.fps.current < 20) {
      issues.push(`Low FPS: ${stats.fps.current}`);
    }

    if (stats.packetLoss && stats.packetLoss > 5) {
      issues.push(`High packet loss: ${stats.packetLoss}%`);
    }

    if (stats.latency && stats.latency > 200) {
      issues.push(`High latency: ${stats.latency}ms`);
    }

    if (stats.connectionQuality === 'poor' || stats.connectionQuality === 'critical') {
      issues.push(`Poor connection quality: ${stats.connectionQuality}`);
    }

    // Emit warnings if issues found
    if (issues.length > 0) {
      socket.emit('vdo:quality:warning', {
        streamId,
        issues,
        timestamp: new Date().toISOString(),
      });

      // Also notify moderators
      this.socketServer.emitToRoom(`stream:${streamId}:moderators`, 'vdo:quality:issues', {
        streamId,
        issues,
        stats,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async storeAnalytics(streamId: string, stats: any) {
    try {
      // TODO: Create StreamAnalytics model in Prisma
      // For now, log to console
      console.log(`Storing analytics for stream ${streamId}:`, {
        fps: stats.fps?.average || 0,
        bitrate: stats.bitrate || 0,
        latency: stats.latency || 0,
        packetLoss: stats.packetLoss || 0,
        connectionQuality: stats.connectionQuality,
        timestamp: new Date(),
      });

      // Future implementation:
      // await this.prisma.streamAnalytics.create({
      //   data: {
      //     streamId,
      //     fps: stats.fps?.average || 0,
      //     bitrate: stats.bitrate || 0,
      //     latency: stats.latency || 0,
      //     packetLoss: stats.packetLoss || 0,
      //     connectionQuality: stats.connectionQuality,
      //     bytesSent: stats.bytesSent || 0,
      //     bytesReceived: stats.bytesReceived || 0,
      //   },
      // });
    } catch (error) {
      console.error('Error storing analytics:', error);
    }
  }

  private async storeRecordingInfo(streamId: string, recording: any) {
    try {
      // TODO: Create StreamRecording model in Prisma
      console.log(`Storing recording info for stream ${streamId}:`, recording);

      // Future implementation:
      // await this.prisma.streamRecording.create({
      //   data: {
      //     streamId,
      //     recordingId: recording.id,
      //     duration: recording.duration,
      //     size: recording.size,
      //     format: recording.format,
      //   },
      // });
    } catch (error) {
      console.error('Error storing recording info:', error);
    }
  }
}
