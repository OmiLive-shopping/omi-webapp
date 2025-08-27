import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';
import { SocketServer } from '../../config/socket/socket.config.js';
import { RoomManager } from '../managers/room.manager.js';
import { EnhancedRateLimiter, createRateLimitedHandler as createEnhancedRateLimitedHandler } from '../managers/enhanced-rate-limiter.js';
import { VdoStreamHandler } from './vdo-stream.handler.js';
import { streamEventEmitter } from '../../features/stream/events/stream-event-emitter.js';
import {
  streamJoinSchema,
  streamUpdateSchema,
  streamFeatureProductSchema,
  streamStatsUpdateSchema,
  streamGetAnalyticsSchema,
  type StreamJoinEvent,
  type StreamUpdateEvent,
  type StreamFeatureProductEvent,
  type StreamStatsUpdateEvent,
  type StreamGetAnalyticsEvent,
} from '../schemas/index.js';
import { createValidatedHandler, createPermissionValidatedHandler } from '../middleware/validation.middleware.js';

export class StreamHandler {
  private roomManager = RoomManager.getInstance();
  private enhancedRateLimiter = EnhancedRateLimiter.getInstance();
  private socketServer = SocketServer.getInstance();
  private prisma = PrismaService.getInstance().client;
  private vdoHandler = new VdoStreamHandler();

  handleJoinStream = createValidatedHandler(
    streamJoinSchema,
    async (socket: SocketWithAuth, data: StreamJoinEvent) => {
      // Check if stream exists and is live
      const stream = await this.prisma.stream.findUnique({
        where: { id: data.streamId },
        select: {
          id: true,
          isLive: true,
          title: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (!stream) {
        socket.emit('error', { message: 'Stream not found' });
        return;
      }

      // Join the room
      console.log(`[STREAM JOIN] ${socket.username || 'anonymous'}(${socket.id}) joining stream room: ${data.streamId}`);
      await this.roomManager.joinRoom(socket, data.streamId);
      const viewerCount = this.roomManager.getViewerCount(data.streamId);
      console.log(`[STREAM JOIN] Room ${data.streamId} now has ${viewerCount} viewers`);

      // Emit viewer joined event
      await streamEventEmitter.emitViewerJoined(data.streamId, {
        id: socket.userId,
        username: socket.username,
        avatarUrl: socket.avatarUrl,
        isAnonymous: !socket.userId,
        socketId: socket.id,
      }, viewerCount);

      // Send stream info to the user
      socket.emit('stream:joined', {
        streamId: stream.id,
        title: stream.title,
        isLive: stream.isLive,
        streamer: stream.user,
        viewerCount,
      });

      // Notify others of new viewer (legacy - will be replaced by event system)
      socket.to(`stream:${data.streamId}`).emit('stream:viewer:joined', {
        viewerCount,
        viewer: socket.userId
          ? {
              id: socket.userId,
              username: socket.username,
            }
          : null,
      });
    },
  );

  handleLeaveStream = createValidatedHandler(
    streamJoinSchema,
    async (socket: SocketWithAuth, data: StreamJoinEvent) => {
      // Calculate session duration if available
      const roomInfo = this.roomManager.getRoomInfo(data.streamId);
      const viewer = roomInfo?.viewers.get(socket.id);
      const duration = viewer?.joinedAt 
        ? Math.floor((Date.now() - viewer.joinedAt.getTime()) / 1000)
        : undefined;

      // Leave the room
      await this.roomManager.leaveRoom(socket, data.streamId);
      const viewerCount = this.roomManager.getViewerCount(data.streamId);

      // Emit viewer left event
      await streamEventEmitter.emitViewerLeft(data.streamId, {
        id: socket.userId,
        username: socket.username,
        socketId: socket.id,
        duration,
      }, viewerCount, 'manual');

      // Notify others (legacy - will be replaced by event system)
      socket.to(`stream:${data.streamId}`).emit('stream:viewer:left', {
        viewerCount,
        viewer: socket.userId
          ? {
              id: socket.userId,
              username: socket.username,
            }
          : null,
      });

      socket.emit('stream:left', { streamId: data.streamId });
    },
  );

  handleStreamUpdate = createPermissionValidatedHandler(
    streamUpdateSchema,
    async (socket: SocketWithAuth, data: StreamUpdateEvent) => {
      // Check if user owns the stream
      const stream = await this.prisma.stream.findUnique({
        where: { id: data.streamId },
        select: { userId: true },
      });

      if (!stream || stream.userId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized to update stream' });
        return;
      }

      // Update stream
      const updatedStream = await this.prisma.stream.update({
        where: { id: data.streamId },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
        },
      });

      // Broadcast update to all viewers
      this.socketServer.emitToRoom(`stream:${data.streamId}`, 'stream:updated', {
        streamId: updatedStream.id,
        title: updatedStream.title,
        description: updatedStream.description,
        thumbnailUrl: updatedStream.thumbnailUrl,
      });
    },
    { authenticated: true },
  );

  handleFeatureProduct = createPermissionValidatedHandler(
    streamFeatureProductSchema,
    async (socket: SocketWithAuth, data: StreamFeatureProductEvent) => {
      // Check if user owns the stream
      const stream = await this.prisma.stream.findUnique({
        where: { id: data.streamId },
        select: { userId: true },
      });

      if (!stream || stream.userId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized to feature products' });
        return;
      }

      // Get product details
      const product = await this.prisma.product.findUnique({
        where: { id: data.productId },
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          description: true,
        },
      });

      if (!product) {
        socket.emit('error', { message: 'Product not found' });
        return;
      }

      // Broadcast featured product to all viewers
      this.socketServer.emitToRoom(`stream:${data.streamId}`, 'stream:product:featured', {
        product,
        duration: data.duration || 30,
        featuredBy: {
          id: socket.userId,
          username: socket.username,
        },
      });
    },
    { authenticated: true, roles: ['streamer', 'admin'] },
  );

  // Handle stream going live
  handleStreamGoLive = async (streamId: string, streamerId: string) => {
    // Create room for the stream
    await this.roomManager.createRoom(streamId);

    // Notify followers that stream is live
    // TODO: Implement follower notification system

    // Broadcast to all connected users
    this.socketServer.getIO().emit('stream:went-live', {
      streamId,
      streamerId,
      timestamp: new Date(),
    });
  };

  // Handle stream ending
  handleStreamEnd = async (streamId: string) => {
    // Notify all viewers
    this.socketServer.emitToRoom(`stream:${streamId}`, 'stream:ended', {
      streamId,
      timestamp: new Date(),
    });

    // Disconnect all viewers
    await this.socketServer.disconnectRoom(`stream:${streamId}`);
  };

  // Get stream analytics
  handleGetAnalytics = createPermissionValidatedHandler(
    streamGetAnalyticsSchema,
    async (socket: SocketWithAuth, data: StreamGetAnalyticsEvent) => {
      // Check if user owns the stream
      const stream = await this.prisma.stream.findUnique({
        where: { id: data.streamId },
        select: { userId: true },
      });

      if (!stream || stream.userId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized to view analytics' });
        return;
      }

      const roomInfo = this.roomManager.getRoomInfo(data.streamId);
      const viewerCount = this.roomManager.getViewerCount(data.streamId);

      // Get viewer breakdown
      const viewers = roomInfo ? Array.from(roomInfo.viewers.values()) : [];
      const authenticatedViewers = viewers.filter(v => v.userId).length;
      const anonymousViewers = viewers.filter(v => !v.userId).length;

      socket.emit('stream:analytics', {
        streamId: data.streamId,
        currentViewers: viewerCount,
        authenticatedViewers,
        anonymousViewers,
        viewerList: viewers
          .filter(v => v.userId)
          .map(v => ({
            userId: v.userId,
            username: v.username,
            joinedAt: v.joinedAt,
          })),
      });
    },
    { authenticated: true, roles: ['streamer', 'admin'] },
  );

  // Handle VDO.ninja stream stats update
  handleStreamStats = createPermissionValidatedHandler(
    streamStatsUpdateSchema,
    async (socket: SocketWithAuth, data: StreamStatsUpdateEvent) => {

      // Check if user owns the stream
      const stream = await this.prisma.stream.findUnique({
        where: { id: data.streamId },
        select: { userId: true, isLive: true },
      });

      if (!stream || stream.userId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized to update stream stats' });
        return;
      }

      if (!stream.isLive) {
        socket.emit('error', { message: 'Stream is not live' });
        return;
      }

      // Store stats in room manager (in-memory for now)
      const roomInfo = this.roomManager.getRoomInfo(data.streamId);
      if (roomInfo) {
        roomInfo.streamStats = {
          ...data.stats,
          lastUpdated: new Date(data.timestamp),
        };
      }

      // Broadcast stats to moderators and analytics viewers
      socket.to(`stream:${data.streamId}:moderators`).emit('stream:stats:update', {
        streamId: data.streamId,
        stats: data.stats,
        timestamp: data.timestamp,
      });

      // Log important stats changes
      if (data.stats.packetLoss && data.stats.packetLoss > 5) {
        console.warn(
          `High packet loss detected for stream ${data.streamId}: ${data.stats.packetLoss}%`,
        );
      }

      // Acknowledge receipt
      socket.emit('stream:stats:received', {
        streamId: data.streamId,
        timestamp: new Date().toISOString(),
      });

      // Update stream quality metrics in database periodically (every 30 seconds)
      const lastDbUpdate = roomInfo?.lastStatsDbUpdate || 0;
      const now = Date.now();
      if (now - lastDbUpdate > 30000) {
        await this.updateStreamQualityMetrics(data.streamId, data.stats);
        if (roomInfo) {
          roomInfo.lastStatsDbUpdate = now;
        }
      }
    },
    { authenticated: true },
  );

  // Helper method to update stream quality metrics in database
  private async updateStreamQualityMetrics(streamId: string, stats: any) {
    try {
      // TODO: Implement StreamAnalytics model in Prisma schema
      // For now, we'll just log the stats
      console.log(`Stream quality metrics for ${streamId}:`, {
        bitrate: stats.bitrate || 0,
        fps: stats.fps || 0,
        latency: stats.latency || 0,
        packetLoss: stats.packetLoss || 0,
        resolution: stats.resolution
          ? `${stats.resolution.width}x${stats.resolution.height}`
          : null,
      });

      // In the future, this will save to database:
      // const analytics = await this.prisma.streamAnalytics.upsert({
      //   where: { streamId },
      //   create: { ... },
      //   update: { ... },
      // });

      return { streamId, stats };
    } catch (error) {
      console.error('Error updating stream quality metrics:', error);
    }
  }

  // Get real-time stream stats
  handleGetStreamStats = createValidatedHandler(
    streamGetAnalyticsSchema,
    async (socket: SocketWithAuth, data: StreamGetAnalyticsEvent) => {
      const roomInfo = this.roomManager.getRoomInfo(data.streamId);

      if (!roomInfo || !roomInfo.streamStats) {
        socket.emit('stream:stats:current', {
          streamId: data.streamId,
          stats: null,
          message: 'No stats available',
        });
        return;
      }

      socket.emit('stream:stats:current', {
        streamId: data.streamId,
        stats: roomInfo.streamStats,
        viewerCount: this.roomManager.getViewerCount(data.streamId),
      });
    },
  );

  /**
   * Register all VDO.Ninja event handlers for a socket
   */
  registerVdoHandlers(socket: SocketWithAuth) {
    // VDO.Ninja stream events with enhanced rate limiting
    socket.on('vdo:stream:event', data => this.vdoHandler.handleVdoStreamEventEnhanced(socket, data));

    // VDO.Ninja statistics
    socket.on('vdo:stats:update', data => this.vdoHandler.handleVdoStatsUpdateEnhanced(socket, data));

    // VDO.Ninja viewer events
    socket.on('vdo:viewer:event', data => this.vdoHandler.handleVdoViewerEventEnhanced(socket, data));

    // VDO.Ninja media control events
    socket.on('vdo:media:event', data => this.vdoHandler.handleVdoMediaEventEnhanced(socket, data));

    // VDO.Ninja quality events
    socket.on('vdo:quality:event', data => this.vdoHandler.handleVdoQualityEventEnhanced(socket, data));

    // VDO.Ninja recording events
    socket.on('vdo:recording:event', data => this.vdoHandler.handleVdoRecordingEventEnhanced(socket, data));

    // Get VDO.Ninja analytics
    socket.on('vdo:get:analytics', data => this.vdoHandler.handleGetVdoAnalyticsEnhanced(socket, data));
  }

  /**
   * Unregister VDO.Ninja handlers when socket disconnects
   */
  unregisterVdoHandlers(socket: SocketWithAuth) {
    socket.removeAllListeners('vdo:stream:event');
    socket.removeAllListeners('vdo:stats:update');
    socket.removeAllListeners('vdo:viewer:event');
    socket.removeAllListeners('vdo:media:event');
    socket.removeAllListeners('vdo:quality:event');
    socket.removeAllListeners('vdo:recording:event');
    socket.removeAllListeners('vdo:get:analytics');
  }

  // Enhanced rate-limited stream handlers
  handleJoinStreamEnhanced = createEnhancedRateLimitedHandler(
    'stream:join',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleJoinStream(socket, data);
    }
  );

  handleLeaveStreamEnhanced = createEnhancedRateLimitedHandler(
    'stream:leave',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleLeaveStream(socket, data);
    }
  );

  handleGetStreamStatsEnhanced = createEnhancedRateLimitedHandler(
    'stream:get:stats',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleGetStreamStats(socket, data);
    }
  );
}
