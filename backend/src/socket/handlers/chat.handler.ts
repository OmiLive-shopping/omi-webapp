import { SocketWithAuth } from '../../config/socket/socket.config';
import { RoomManager } from '../managers/room.manager';
import { PrismaService } from '../../config/prisma.config';
import { z } from 'zod';

// Message schemas
const sendMessageSchema = z.object({
  streamId: z.string().uuid(),
  content: z.string().min(1).max(500),
  replyTo: z.string().uuid().optional(),
});

const deleteMessageSchema = z.object({
  streamId: z.string().uuid(),
  messageId: z.string().uuid(),
});

const moderateUserSchema = z.object({
  streamId: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.enum(['timeout', 'ban', 'unban']),
  reason: z.string().optional(),
  duration: z.number().optional(), // For timeout in seconds
});

export class ChatHandler {
  private roomManager = RoomManager.getInstance();
  private prisma = PrismaService.getInstance().client;

  handleSendMessage = async (socket: SocketWithAuth, data: any) => {
    try {
      // Validate input
      const validated = sendMessageSchema.parse(data);
      
      // Check if user is authenticated
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to send messages' });
        return;
      }

      // Check if user is in the room
      const room = this.roomManager.getRoomInfo(validated.streamId);
      if (!room || !room.viewers.has(socket.id)) {
        socket.emit('error', { message: 'You must join the stream to send messages' });
        return;
      }

      // TODO: Check if user is timed out or banned

      // Create message in database
      const message = await this.prisma.comment.create({
        data: {
          content: validated.content,
          userId: socket.userId,
          streamId: validated.streamId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Format message for broadcast
      const chatMessage = {
        id: message.id,
        content: message.content,
        userId: message.user.id,
        username: message.user.username,
        avatarUrl: message.user.avatarUrl,
        role: message.user.role?.name || 'viewer',
        timestamp: message.createdAt,
        replyTo: validated.replyTo,
        type: 'message' as const,
      };

      // Broadcast to all users in the stream
      socket.to(`stream:${validated.streamId}`).emit('chat:message', chatMessage);
      socket.emit('chat:message:sent', chatMessage);

    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid message data', errors: error.errors });
      } else {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    }
  };

  handleDeleteMessage = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = deleteMessageSchema.parse(data);

      // Get message to check ownership
      const message = await this.prisma.comment.findUnique({
        where: { id: validated.messageId },
        select: {
          userId: true,
          streamId: true,
        },
      });

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check permissions (owner or moderator)
      const isModerator = this.roomManager.isModerator(validated.streamId, socket.userId!);
      const isOwner = message.userId === socket.userId;

      if (!isOwner && !isModerator) {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      // Delete message
      await this.prisma.comment.delete({
        where: { id: validated.messageId },
      });

      // Broadcast deletion
      socket.to(`stream:${validated.streamId}`).emit('chat:message:deleted', {
        messageId: validated.messageId,
        deletedBy: socket.userId,
      });
      socket.emit('chat:message:deleted', {
        messageId: validated.messageId,
        deletedBy: socket.userId,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid data', errors: error.errors });
      } else {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    }
  };

  handleModerateUser = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = moderateUserSchema.parse(data);

      // Check if user is moderator
      if (!this.roomManager.isModerator(validated.streamId, socket.userId!)) {
        socket.emit('error', { message: 'Moderator permissions required' });
        return;
      }

      // TODO: Implement user moderation (timeout, ban, unban)
      // This would involve creating a moderation table to track bans/timeouts

      // Broadcast moderation action
      const moderationEvent = {
        userId: validated.userId,
        action: validated.action,
        moderatorId: socket.userId,
        reason: validated.reason,
        duration: validated.duration,
        timestamp: new Date(),
      };

      socket.to(`stream:${validated.streamId}`).emit('chat:user:moderated', moderationEvent);
      socket.emit('chat:moderation:success', moderationEvent);

      // If banning, disconnect the user
      if (validated.action === 'ban') {
        // Find user's sockets and disconnect them
        // TODO: Implement this when we have user socket tracking
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid moderation data', errors: error.errors });
      } else {
        console.error('Error moderating user:', error);
        socket.emit('error', { message: 'Failed to moderate user' });
      }
    }
  };

  // Handle typing indicators
  handleTyping = async (socket: SocketWithAuth, data: { streamId: string; isTyping: boolean }) => {
    if (!socket.userId) return;

    const event = data.isTyping ? 'chat:user:typing' : 'chat:user:stopped-typing';
    socket.to(`stream:${data.streamId}`).emit(event, {
      userId: socket.userId,
      username: socket.username,
    });
  };

  // Get chat history
  handleGetHistory = async (socket: SocketWithAuth, data: { streamId: string; before?: string; limit?: number }) => {
    try {
      const limit = Math.min(data.limit || 50, 100);
      
      const messages = await this.prisma.comment.findMany({
        where: {
          streamId: data.streamId,
          ...(data.before && { createdAt: { lt: new Date(data.before) } }),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        userId: msg.user.id,
        username: msg.user.username,
        avatarUrl: msg.user.avatarUrl,
        role: msg.user.role?.name || 'viewer',
        timestamp: msg.createdAt,
        type: 'message' as const,
      })).reverse();

      socket.emit('chat:history', {
        streamId: data.streamId,
        messages: formattedMessages,
      });

    } catch (error) {
      console.error('Error getting chat history:', error);
      socket.emit('error', { message: 'Failed to get chat history' });
    }
  };
}