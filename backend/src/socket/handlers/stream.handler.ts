import { z } from 'zod';

import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';
import { SocketServer } from '../../config/socket/socket.config.js';
import { RoomManager } from '../managers/room.manager.js';
import { VdoStreamHandler } from './vdo-stream.handler.js';

const joinStreamSchema = z.object({
  streamId: z.string().uuid(),
});

const streamUpdateSchema = z.object({
  streamId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

const featureProductSchema = z.object({
  streamId: z.string().uuid(),
  productId: z.string().uuid(),
  duration: z.number().min(5).max(300).optional(), // Duration in seconds
});

const streamStatsSchema = z.object({
  streamId: z.string().uuid(),
  stats: z.object({
    bitrate: z.number().optional(),
    fps: z.number().optional(),
    resolution: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
    audioLevel: z.number().optional(),
    packetLoss: z.number().optional(),
    latency: z.number().optional(),
    bandwidth: z.object({
      upload: z.number(),
      download: z.number(),
    }).optional(),
  }),
  timestamp: z.string().datetime(),
});

export class StreamHandler {
  private roomManager = RoomManager.getInstance();
  private socketServer = SocketServer.getInstance();
  private prisma = PrismaService.getInstance().client;
  private vdoHandler = new VdoStreamHandler();

  handleJoinStream = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = joinStreamSchema.parse(data);

      // Check if stream exists and is live
      const stream = await this.prisma.stream.findUnique({
        where: { id: validated.streamId },
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
      await this.roomManager.joinRoom(socket, validated.streamId);

      // Send stream info to the user
      socket.emit('stream:joined', {
        streamId: stream.id,
        title: stream.title,
        isLive: stream.isLive,
        streamer: stream.user,
        viewerCount: this.roomManager.getViewerCount(validated.streamId),
      });

      // Notify others of new viewer
      socket.to(`stream:${validated.streamId}`).emit('stream:viewer:joined', {
        viewerCount: this.roomManager.getViewerCount(validated.streamId),
        viewer: socket.userId
          ? {
              id: socket.userId,
              username: socket.username,
            }
          : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid stream data', errors: error.errors });
      } else {
        console.error('Error joining stream:', error);
        socket.emit('error', { message: 'Failed to join stream' });
      }
    }
  };

  handleLeaveStream = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = joinStreamSchema.parse(data);

      // Leave the room
      await this.roomManager.leaveRoom(socket, validated.streamId);

      // Notify others
      socket.to(`stream:${validated.streamId}`).emit('stream:viewer:left', {
        viewerCount: this.roomManager.getViewerCount(validated.streamId),
        viewer: socket.userId
          ? {
              id: socket.userId,
              username: socket.username,
            }
          : null,
      });

      socket.emit('stream:left', { streamId: validated.streamId });
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  };

  handleStreamUpdate = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = streamUpdateSchema.parse(data);

      // Check if user owns the stream
      const stream = await this.prisma.stream.findUnique({
        where: { id: validated.streamId },
        select: { userId: true },
      });

      if (!stream || stream.userId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized to update stream' });
        return;
      }

      // Update stream
      const updatedStream = await this.prisma.stream.update({
        where: { id: validated.streamId },
        data: {
          ...(validated.title && { title: validated.title }),
          ...(validated.description && { description: validated.description }),
          ...(validated.thumbnailUrl && { thumbnailUrl: validated.thumbnailUrl }),
        },
      });

      // Broadcast update to all viewers
      this.socketServer.emitToRoom(`stream:${validated.streamId}`, 'stream:updated', {
        streamId: updatedStream.id,
        title: updatedStream.title,
        description: updatedStream.description,
        thumbnailUrl: updatedStream.thumbnailUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid update data', errors: error.errors });
      } else {
        console.error('Error updating stream:', error);
        socket.emit('error', { message: 'Failed to update stream' });
      }
    }
  };

  handleFeatureProduct = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = featureProductSchema.parse(data);

      // Check if user owns the stream
      const stream = await this.prisma.stream.findUnique({
        where: { id: validated.streamId },
        select: { userId: true },
      });

      if (!stream || stream.userId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized to feature products' });
        return;
      }

      // Get product details
      const product = await this.prisma.product.findUnique({
        where: { id: validated.productId },
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
      this.socketServer.emitToRoom(`stream:${validated.streamId}`, 'stream:product:featured', {
        product,
        duration: validated.duration || 30,
        featuredBy: {
          id: socket.userId,
          username: socket.username,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid product data', errors: error.errors });
      } else {
        console.error('Error featuring product:', error);
        socket.emit('error', { message: 'Failed to feature product' });
      }
    }
  };

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
  handleGetAnalytics = async (socket: SocketWithAuth, data: { streamId: string }) => {
    try {
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
    } catch (error) {
      console.error('Error getting analytics:', error);
      socket.emit('error', { message: 'Failed to get analytics' });
    }
  };

  // Handle VDO.ninja stream stats update
  handleStreamStats = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = streamStatsSchema.parse(data);

      // Check if user owns the stream
      const stream = await this.prisma.stream.findUnique({
        where: { id: validated.streamId },
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
      const roomInfo = this.roomManager.getRoomInfo(validated.streamId);
      if (roomInfo) {
        roomInfo.streamStats = {
          ...validated.stats,
          lastUpdated: new Date(validated.timestamp),
        };
      }

      // Broadcast stats to moderators and analytics viewers
      socket.to(`stream:${validated.streamId}:moderators`).emit('stream:stats:update', {
        streamId: validated.streamId,
        stats: validated.stats,
        timestamp: validated.timestamp,
      });

      // Log important stats changes
      if (validated.stats.packetLoss && validated.stats.packetLoss > 5) {
        console.warn(`High packet loss detected for stream ${validated.streamId}: ${validated.stats.packetLoss}%`);
      }

      // Acknowledge receipt
      socket.emit('stream:stats:received', {
        streamId: validated.streamId,
        timestamp: new Date().toISOString(),
      });

      // Update stream quality metrics in database periodically (every 30 seconds)
      const lastDbUpdate = roomInfo?.lastStatsDbUpdate || 0;
      const now = Date.now();
      if (now - lastDbUpdate > 30000) {
        await this.updateStreamQualityMetrics(validated.streamId, validated.stats);
        if (roomInfo) {
          roomInfo.lastStatsDbUpdate = now;
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid stats data', errors: error.errors });
      } else {
        console.error('Error handling stream stats:', error);
        socket.emit('error', { message: 'Failed to process stream stats' });
      }
    }
  };

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
        resolution: stats.resolution ? `${stats.resolution.width}x${stats.resolution.height}` : null,
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
  handleGetStreamStats = async (socket: SocketWithAuth, data: { streamId: string }) => {
    try {
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
    } catch (error) {
      console.error('Error getting stream stats:', error);
      socket.emit('error', { message: 'Failed to get stream stats' });
    }
  };

  /**
   * Register all VDO.Ninja event handlers for a socket
   */
  registerVdoHandlers(socket: SocketWithAuth) {
    // VDO.Ninja stream events
    socket.on('vdo:stream:event', (data) => this.vdoHandler.handleVdoStreamEvent(socket, data));
    
    // VDO.Ninja statistics
    socket.on('vdo:stats:update', (data) => this.vdoHandler.handleVdoStatsUpdate(socket, data));
    
    // VDO.Ninja viewer events
    socket.on('vdo:viewer:event', (data) => this.vdoHandler.handleVdoViewerEvent(socket, data));
    
    // VDO.Ninja media control events
    socket.on('vdo:media:event', (data) => this.vdoHandler.handleVdoMediaEvent(socket, data));
    
    // VDO.Ninja quality events
    socket.on('vdo:quality:event', (data) => this.vdoHandler.handleVdoQualityEvent(socket, data));
    
    // VDO.Ninja recording events
    socket.on('vdo:recording:event', (data) => this.vdoHandler.handleVdoRecordingEvent(socket, data));
    
    // Get VDO.Ninja analytics
    socket.on('vdo:get:analytics', (data) => this.vdoHandler.handleGetVdoAnalytics(socket, data));
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
}
