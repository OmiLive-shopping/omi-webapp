import { SocketWithAuth } from '../../config/socket/socket.config';
import { RoomManager } from '../managers/room.manager';
import { SocketServer } from '../../config/socket/socket.config';
import { PrismaService } from '../../config/prisma.config';
import { z } from 'zod';

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

export class StreamHandler {
  private roomManager = RoomManager.getInstance();
  private socketServer = SocketServer.getInstance();
  private prisma = PrismaService.getInstance().client;

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
        viewer: socket.userId ? {
          id: socket.userId,
          username: socket.username,
        } : null,
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
        viewer: socket.userId ? {
          id: socket.userId,
          username: socket.username,
        } : null,
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
        viewerList: viewers.filter(v => v.userId).map(v => ({
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
}