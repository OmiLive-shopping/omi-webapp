import { z } from 'zod';

import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';
import { ChatRateLimiter, SlowModeManager } from '../managers/rate-limiter.js';
import { RoomManager } from '../managers/room.manager.js';
import type { VdoQualityEvent, VdoStreamEvent, VdoViewerEvent } from '../types/vdo-events.types.js';
import { ChatCommandHandler } from './chat-commands.js';

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

const reactToMessageSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().emoji().max(2), // Single emoji
});

const pinMessageSchema = z.object({
  streamId: z.string().uuid(),
  messageId: z.string().uuid(),
  pin: z.boolean(),
});

const slowModeSchema = z.object({
  streamId: z.string().uuid(),
  enabled: z.boolean(),
  delay: z.number().min(0).max(300).optional(), // Max 5 minutes
});

export class ChatHandler {
  private roomManager = RoomManager.getInstance();
  private rateLimiter = ChatRateLimiter.getInstance();
  private slowModeManager = SlowModeManager.getInstance();
  private commandHandler = new ChatCommandHandler();
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

      // Check if this is a VDO command first
      if (await this.handleVdoCommand(socket, validated.streamId, validated.content)) {
        return; // VDO command was processed
      }

      // Check if this is a regular command
      if (await this.commandHandler.processCommand(socket, validated.streamId, validated.content)) {
        return; // Command was processed, don't send as regular message
      }

      // Check rate limiting
      const userRole = socket.role || 'viewer';
      if (this.rateLimiter.isInCooldown(socket.userId)) {
        const resetTime = this.rateLimiter.getResetTime(socket.userId, userRole);
        socket.emit('error', {
          message: 'You are in cooldown. Please wait.',
          cooldownRemaining: Math.ceil(resetTime / 1000),
        });
        return;
      }

      if (!this.rateLimiter.canSendMessage(socket.userId, userRole)) {
        const resetTime = this.rateLimiter.getResetTime(socket.userId, userRole);
        socket.emit('error', {
          message: 'Rate limit exceeded. Please slow down.',
          resetIn: Math.ceil(resetTime / 1000),
        });
        return;
      }

      // Check slow mode
      if (!this.slowModeManager.canSendInSlowMode(socket.userId, validated.streamId, userRole)) {
        const remaining = this.slowModeManager.getRemainingSlowModeTime(
          socket.userId,
          validated.streamId,
        );
        socket.emit('error', {
          message: `Slow mode is enabled. Wait ${Math.ceil(remaining)} seconds.`,
          slowModeRemaining: Math.ceil(remaining),
        });
        return;
      }

      // Check if user is timed out or banned
      const activeModeration = await this.prisma.chatModeration.findFirst({
        where: {
          streamId: validated.streamId,
          userId: socket.userId,
          action: { in: ['timeout', 'ban'] },
          OR: [
            { expiresAt: null }, // Permanent ban
            { expiresAt: { gt: new Date() } }, // Active timeout
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeModeration) {
        if (activeModeration.action === 'ban') {
          socket.emit('error', { message: 'You are banned from this chat' });
        } else {
          const remaining = activeModeration.expiresAt
            ? Math.ceil((activeModeration.expiresAt.getTime() - Date.now()) / 1000)
            : 0;
          socket.emit('error', {
            message: `You are timed out for ${remaining} seconds`,
            timeoutRemaining: remaining,
          });
        }
        return;
      }

      // Create message in database
      const message = await this.prisma.comment.create({
        data: {
          content: validated.content,
          userId: socket.userId,
          streamId: validated.streamId,
          replyToId: validated.replyTo,
        },
      });

      // Get user info separately since Comment model doesn't have user relation
      const user = await this.prisma.user.findUnique({
        where: { id: socket.userId },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      });

      // Format message for broadcast
      const chatMessage = {
        id: message.id,
        content: message.content,
        userId: user?.id || socket.userId,
        username: user?.username || socket.username || 'Anonymous',
        avatarUrl: user?.avatarUrl || null,
        role: user?.role || 'viewer',
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

      // Can't moderate yourself
      if (validated.userId === socket.userId) {
        socket.emit('error', { message: 'Cannot moderate yourself' });
        return;
      }

      // Check if target is stream owner or moderator
      const stream = await this.prisma.stream.findUnique({
        where: { id: validated.streamId },
        select: { userId: true },
      });

      if (stream?.userId === validated.userId) {
        socket.emit('error', { message: 'Cannot moderate the stream owner' });
        return;
      }

      if (
        this.roomManager.isModerator(validated.streamId, validated.userId) &&
        socket.role !== 'admin'
      ) {
        socket.emit('error', { message: 'Cannot moderate other moderators' });
        return;
      }

      // Create moderation record
      const expiresAt =
        validated.action === 'timeout' && validated.duration
          ? new Date(Date.now() + validated.duration * 1000)
          : validated.action === 'ban'
            ? null
            : undefined;

      const moderation = await this.prisma.chatModeration.create({
        data: {
          streamId: validated.streamId,
          userId: validated.userId,
          moderatorId: socket.userId!,
          action: validated.action,
          reason: validated.reason,
          duration: validated.duration,
          expiresAt,
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      // Broadcast moderation action
      const moderationEvent = {
        userId: validated.userId,
        username: moderation.user.username,
        action: validated.action,
        moderatorId: socket.userId,
        reason: validated.reason,
        duration: validated.duration,
        timestamp: new Date(),
      };

      socket.to(`stream:${validated.streamId}`).emit('chat:user:moderated', moderationEvent);
      socket.emit('chat:moderation:success', moderationEvent);

      // If banning or timeout, notify the user
      if (validated.action === 'ban' || validated.action === 'timeout') {
        socket.to(`user:${validated.userId}`).emit('chat:you:moderated', {
          streamId: validated.streamId,
          action: validated.action,
          reason: validated.reason,
          duration: validated.duration,
          expiresAt,
        });
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
  handleGetHistory = async (
    socket: SocketWithAuth,
    data: { streamId: string; before?: string; limit?: number },
  ) => {
    try {
      const limit = Math.min(data.limit || 50, 100);

      const messages = await this.prisma.comment.findMany({
        where: {
          streamId: data.streamId,
          ...(data.before && { createdAt: { lt: new Date(data.before) } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Get user info for all messages
      const userIds = [...new Set(messages.map(m => m.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      const formattedMessages = messages
        .map(msg => {
          const user = userMap.get(msg.userId);
          return {
            id: msg.id,
            content: msg.content,
            userId: msg.userId,
            username: user?.username || 'Anonymous',
            avatarUrl: user?.avatarUrl || null,
            role: user?.role || 'viewer',
            timestamp: msg.createdAt,
            type: 'message' as const,
          };
        })
        .reverse();

      socket.emit('chat:history', {
        streamId: data.streamId,
        messages: formattedMessages,
      });
    } catch (error) {
      console.error('Error getting chat history:', error);
      socket.emit('error', { message: 'Failed to get chat history' });
    }
  };

  // Handle message reactions
  handleReactToMessage = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = reactToMessageSchema.parse(data);

      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to react to messages' });
        return;
      }

      // Check if message exists
      const message = await this.prisma.comment.findUnique({
        where: { id: validated.messageId },
        select: { streamId: true },
      });

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user already reacted with this emoji
      const existingReaction = await this.prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId: validated.messageId,
            userId: socket.userId,
            emoji: validated.emoji,
          },
        },
      });

      if (existingReaction) {
        // Remove reaction
        await this.prisma.messageReaction.delete({
          where: { id: existingReaction.id },
        });

        socket.to(`stream:${message.streamId}`).emit('chat:reaction:removed', {
          messageId: validated.messageId,
          userId: socket.userId,
          emoji: validated.emoji,
        });
      } else {
        // Add reaction
        await this.prisma.messageReaction.create({
          data: {
            messageId: validated.messageId,
            userId: socket.userId,
            emoji: validated.emoji,
          },
        });

        socket.to(`stream:${message.streamId}`).emit('chat:reaction:added', {
          messageId: validated.messageId,
          userId: socket.userId,
          username: socket.username,
          emoji: validated.emoji,
        });
      }

      // Get updated reaction counts
      const reactions = await this.prisma.messageReaction.groupBy({
        by: ['emoji'],
        where: { messageId: validated.messageId },
        _count: true,
      });

      socket.emit('chat:reaction:success', {
        messageId: validated.messageId,
        reactions: reactions ? reactions.map(r => ({ emoji: r.emoji, count: r._count })) : [],
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid reaction data', errors: error.errors });
      } else {
        console.error('Error reacting to message:', error);
        socket.emit('error', { message: 'Failed to react to message' });
      }
    }
  };

  // Handle message pinning
  handlePinMessage = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = pinMessageSchema.parse(data);

      // Check if user is moderator or stream owner
      if (!this.roomManager.isModerator(validated.streamId, socket.userId!)) {
        const stream = await this.prisma.stream.findUnique({
          where: { id: validated.streamId },
          select: { userId: true },
        });

        if (stream?.userId !== socket.userId) {
          socket.emit('error', { message: 'Moderator permissions required to pin messages' });
          return;
        }
      }

      if (validated.pin) {
        // Unpin any existing pinned message
        await this.prisma.comment.updateMany({
          where: {
            streamId: validated.streamId,
            isPinned: true,
          },
          data: { isPinned: false },
        });

        // Pin the new message
        const message = await this.prisma.comment.update({
          where: { id: validated.messageId },
          data: { isPinned: true },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        socket.to(`stream:${validated.streamId}`).emit('chat:message:pinned', {
          message: {
            id: message.id,
            content: message.content,
            userId: message.user.id,
            username: message.user.username,
            avatarUrl: message.user.avatarUrl,
            timestamp: message.createdAt,
            isPinned: true,
          },
          pinnedBy: socket.userId,
        });
      } else {
        // Unpin message
        await this.prisma.comment.update({
          where: { id: validated.messageId },
          data: { isPinned: false },
        });

        socket.to(`stream:${validated.streamId}`).emit('chat:message:unpinned', {
          messageId: validated.messageId,
          unpinnedBy: socket.userId,
        });
      }

      socket.emit('chat:pin:success', { messageId: validated.messageId, pinned: validated.pin });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid pin data', errors: error.errors });
      } else {
        console.error('Error pinning message:', error);
        socket.emit('error', { message: 'Failed to pin message' });
      }
    }
  };

  // Send VDO.Ninja system messages
  sendVdoSystemMessage = async (
    streamId: string,
    type: 'stream' | 'viewer' | 'quality' | 'error',
    message: string,
    metadata?: any,
  ) => {
    try {
      const systemMessage = {
        id: `system-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        content: message,
        userId: 'system',
        username: 'System',
        avatarUrl: null,
        role: 'system',
        timestamp: new Date(),
        type: 'system' as const,
        subType: type,
        metadata,
      };

      // Get the socket server instance to broadcast
      const io = (global as any).io;
      if (io) {
        io.to(`stream:${streamId}`).emit('chat:system:message', systemMessage);
      }
    } catch (error) {
      console.error('Error sending VDO system message:', error);
    }
  };

  // Handle VDO.Ninja stream events
  handleVdoStreamEvent = async (data: VdoStreamEvent) => {
    const { streamId, action } = data;

    const messages: Record<string, string> = {
      'stream-started': '🎬 Stream has started',
      'stream-stopped': '🛑 Stream has ended',
      'stream-paused': '⏸️ Stream has been paused',
      'stream-resumed': '▶️ Stream has resumed',
      'stream-reconnecting': '🔄 Stream is reconnecting...',
      'stream-reconnected': '✅ Stream reconnected',
    };

    const message = messages[action];
    if (message) {
      await this.sendVdoSystemMessage(streamId, 'stream', message, { action });
    }
  };

  // Handle VDO.Ninja viewer events
  handleVdoViewerEvent = async (data: VdoViewerEvent) => {
    const { streamId, action, viewer } = data;

    if (action === 'joined') {
      await this.sendVdoSystemMessage(
        streamId,
        'viewer',
        `👋 ${viewer.username || 'Guest'} joined the stream`,
        { viewerId: viewer.id, action },
      );
    } else if (action === 'left') {
      await this.sendVdoSystemMessage(
        streamId,
        'viewer',
        `👋 ${viewer.username || 'Guest'} left the stream`,
        { viewerId: viewer.id, action },
      );
    }
  };

  // Handle VDO.Ninja quality events
  handleVdoQualityEvent = async (data: VdoQualityEvent) => {
    const { streamId, quality } = data;

    // Check quality preset levels
    if (quality.preset === 'low' || (quality.bitrate && quality.bitrate < 1000000)) {
      await this.sendVdoSystemMessage(
        streamId,
        'quality',
        '⚠️ Stream quality has been reduced due to network conditions',
        { quality },
      );
    } else if (quality.preset === 'high' || quality.preset === 'ultra') {
      await this.sendVdoSystemMessage(streamId, 'quality', '✅ Stream quality has improved', {
        quality,
      });
    }
  };

  // Handle VDO.Ninja stream commands in chat
  handleVdoCommand = async (
    socket: SocketWithAuth,
    streamId: string,
    command: string,
  ): Promise<boolean> => {
    const vdoCommands = [
      '/mute',
      '/unmute',
      '/hide',
      '/show',
      '/quality',
      '/stats',
      '/viewers',
      '/record',
      '/stoprecord',
      '/screenshot',
    ];

    const cmd = command.split(' ')[0].toLowerCase();
    if (!vdoCommands.includes(cmd)) {
      return false;
    }

    // Check if user is moderator or stream owner
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { userId: true },
    });

    const isModerator = this.roomManager.isModerator(streamId, socket.userId!);
    const isOwner = stream?.userId === socket.userId;

    if (!isModerator && !isOwner) {
      socket.emit('error', { message: 'Permission denied for VDO.Ninja commands' });
      return true;
    }

    // Emit VDO command event to be handled by VDO integration
    socket.emit('vdo:command', {
      streamId,
      command: cmd.substring(1), // Remove the /
      args: command.split(' ').slice(1),
      timestamp: new Date(),
    });

    // Send feedback message
    await this.sendVdoSystemMessage(streamId, 'stream', `🎮 Executing command: ${cmd}`, {
      command: cmd,
      executor: socket.username,
    });

    return true;
  };

  // Handle slow mode toggle
  handleSlowMode = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = slowModeSchema.parse(data);

      // Check if user is moderator or stream owner
      const stream = await this.prisma.stream.findUnique({
        where: { id: validated.streamId },
        select: { userId: true },
      });

      if (
        stream?.userId !== socket.userId &&
        !this.roomManager.isModerator(validated.streamId, socket.userId!)
      ) {
        socket.emit('error', { message: 'Moderator permissions required' });
        return;
      }

      if (validated.enabled) {
        const delay = validated.delay || 30; // Default 30 seconds
        this.slowModeManager.enableSlowMode(validated.streamId, delay);

        // Update in database
        await this.prisma.stream.update({
          where: { id: validated.streamId },
          data: { slowModeDelay: delay },
        });

        socket.to(`stream:${validated.streamId}`).emit('chat:slowmode:enabled', { delay });
        socket.emit('chat:slowmode:success', { enabled: true, delay });
      } else {
        this.slowModeManager.disableSlowMode(validated.streamId);

        // Update in database
        await this.prisma.stream.update({
          where: { id: validated.streamId },
          data: { slowModeDelay: 0 },
        });

        socket.to(`stream:${validated.streamId}`).emit('chat:slowmode:disabled');
        socket.emit('chat:slowmode:success', { enabled: false });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', { message: 'Invalid slow mode data', errors: error.errors });
      } else {
        console.error('Error toggling slow mode:', error);
        socket.emit('error', { message: 'Failed to toggle slow mode' });
      }
    }
  };
}
