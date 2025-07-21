import { Socket } from 'socket.io';

import { PrismaService } from '../config/prisma.config';
import { SocketService } from '../config/socket.config';
import { ProductRepository } from '../features/product/repositories/product.repository';
import { StreamRepository } from '../features/stream/repositories/stream.repository';
import { StreamService } from '../features/stream/services/stream.service';
import { UserRepository } from '../features/user/repositories/user.repository';

export class StreamSocketHandler {
  private streamService: StreamService;
  private socketService: SocketService;

  constructor() {
    const prisma = PrismaService.getInstance();
    const streamRepository = new StreamRepository(prisma.client);
    const userRepository = new UserRepository(prisma.client);
    const productRepository = new ProductRepository(prisma.client);

    this.streamService = new StreamService(streamRepository, productRepository, userRepository);
    this.socketService = SocketService.getInstance();
  }

  public handleConnection(socket: Socket & { user?: any }): void {
    // Join stream room
    socket.on('join_stream', async (streamId: string) => {
      try {
        const streamResponse = await this.streamService.getStreamById(streamId);
        if (!streamResponse.success || !streamResponse.data) {
          socket.emit('error', { message: 'Stream not found' });
          return;
        }

        const stream = streamResponse.data;
        socket.join(`stream:${streamId}`);
        socket.emit('joined_stream', { streamId, stream });

        // Increment viewer count if stream is live
        if (stream.isLive) {
          await this.streamService.updateViewerCount(streamId, { increment: true });
          const updatedStreamResponse = await this.streamService.getStreamById(streamId);
          this.socketService.emitToRoom(`stream:${streamId}`, 'viewer_count_updated', {
            streamId,
            viewerCount: updatedStreamResponse.data?.viewerCount || 0,
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave stream room
    socket.on('leave_stream', async (streamId: string) => {
      try {
        socket.leave(`stream:${streamId}`);

        // Decrement viewer count if stream is live
        const streamResponse = await this.streamService.getStreamById(streamId);
        if (streamResponse.data?.isLive) {
          await this.streamService.updateViewerCount(streamId, { decrement: true });
          const updatedStreamResponse = await this.streamService.getStreamById(streamId);
          this.socketService.emitToRoom(`stream:${streamId}`, 'viewer_count_updated', {
            streamId,
            viewerCount: updatedStreamResponse.data?.viewerCount || 0,
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Send chat message
    socket.on('send_message', async (data: { streamId: string; content: string }) => {
      try {
        const { streamId, content } = data;

        // Check if stream is live
        const streamResponse = await this.streamService.getStreamById(streamId);
        if (!streamResponse.data?.isLive) {
          socket.emit('error', { message: 'Stream is not live' });
          return;
        }

        // Create comment
        const commentResponse = await this.streamService.addComment(streamId, socket.user!.id, {
          content,
        });

        if (!commentResponse.success || !commentResponse.data) {
          socket.emit('error', { message: 'Failed to send message' });
          return;
        }

        const comment = commentResponse.data;
        // Emit to all users in the stream room
        this.socketService.emitToRoom(`stream:${streamId}`, 'new_message', {
          id: comment.id,
          content: comment.content,
          userId: comment.userId,
          username: socket.user!.username,
          streamId: comment.streamId,
          createdAt: comment.createdAt,
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnecting', async () => {
      // Get all rooms the socket is in
      const rooms = Array.from(socket.rooms);

      // Leave all stream rooms and decrement viewer count
      for (const room of rooms) {
        if (room.startsWith('stream:')) {
          const streamId = room.replace('stream:', '');
          try {
            const streamResponse = await this.streamService.getStreamById(streamId);
            if (streamResponse.data?.isLive) {
              await this.streamService.updateViewerCount(streamId, { decrement: true });
              const updatedStreamResponse = await this.streamService.getStreamById(streamId);
              this.socketService.emitToRoom(`stream:${streamId}`, 'viewer_count_updated', {
                streamId,
                viewerCount: updatedStreamResponse.data?.viewerCount || 0,
              });
            }
          } catch (error) {
            console.error(`Error updating viewer count on disconnect:`, error);
          }
        }
      }
    });
  }
}
