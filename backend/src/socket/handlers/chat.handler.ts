import { z } from 'zod';
import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';
import { ChatMessage } from '@omi-live/shared-types';
import { ChatRateLimiter, SlowModeManager } from '../managers/rate-limiter.js';
import { EnhancedRateLimiter, createRateLimitedHandler as createEnhancedRateLimitedHandler } from '../managers/enhanced-rate-limiter.js';
import { RoomManager } from '../managers/room.manager.js';
import type { VdoQualityEvent, VdoStreamEvent, VdoViewerEvent } from '../types/vdo-events.types.js';
import { ChatCommandHandler } from './chat-commands.js';
import {
  chatSendMessageSchema,
  chatDeleteMessageSchema,
  chatModerateUserSchema,
  chatReactSchema,
  chatPinMessageSchema,
  chatSlowModeSchema,
  chatTypingSchema,
  chatGetHistorySchema,
  type ChatSendMessageEvent,
  type ChatDeleteMessageEvent,
  type ChatModerateUserEvent,
  type ChatReactEvent,
  type ChatPinMessageEvent,
  type ChatSlowModeEvent,
  type ChatTypingEvent,
  type ChatGetHistoryEvent,
} from '../schemas/index.js';
import { createValidatedHandler, createRateLimitedHandler, createPermissionValidatedHandler } from '../middleware/validation.middleware.js';
import { ChatStreamIntegrationService } from '../services/chat-stream-integration.service.js';
import { StreamCommandParser, type CommandContext, type CommandExecutionResult } from '../utils/stream-commands.js';

export class ChatHandler {
  private roomManager = RoomManager.getInstance();
  private rateLimiter = ChatRateLimiter.getInstance();
  private enhancedRateLimiter = EnhancedRateLimiter.getInstance();
  private slowModeManager = SlowModeManager.getInstance();
  private commandHandler = new ChatCommandHandler();
  private chatIntegration = ChatStreamIntegrationService.getInstance();
  private prisma = PrismaService.getInstance().client;

  handleSendMessage = async (socket: SocketWithAuth, data: any) => {
    console.log(`[CHAT] handleSendMessage called for socket ${socket.id} with data:`, data);
    try {
      // Validate input
      const validated = chatSendMessageSchema.parse(data);
      console.log(`[CHAT] Message validated:`, validated);

      // Check if user is authenticated
      if (!socket.userId) {
        console.log(`[CHAT DEBUG] ❌ No socket.userId for socket ${socket.id}, username: ${socket.username}`);
        socket.emit('error', { message: 'Authentication required to send messages' });
        return;
      }
      
      console.log(`[CHAT DEBUG] ✅ Socket authenticated - userId: ${socket.userId}, username: ${socket.username}`);

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

      // Check if this is a stream command
      if (await this.handleStreamCommand(socket, validated.streamId, validated.content)) {
        return; // Stream command was processed
      }

      // Check if this is a regular command
      if (await this.commandHandler.processCommand(socket, validated.streamId, validated.content)) {
        return; // Command was processed, don't send as regular message
      }

      // Check rate limiting
      const userIdentifier = socket.userId;
      const userRole = socket.role || 'viewer';
      if (this.rateLimiter.isInCooldown(userIdentifier)) {
        const resetTime = this.rateLimiter.getResetTime(userIdentifier, userRole);
        socket.emit('error', {
          message: 'You are in cooldown. Please wait.',
          cooldownRemaining: Math.ceil(resetTime / 1000),
        });
        return;
      }

      if (!this.rateLimiter.canSendMessage(userIdentifier, userRole)) {
        const resetTime = this.rateLimiter.getResetTime(userIdentifier, userRole);
        socket.emit('error', {
          message: 'Rate limit exceeded. Please slow down.',
          resetIn: Math.ceil(resetTime / 1000),
        });
        return;
      }

      // Check slow mode
      if (!this.slowModeManager.canSendInSlowMode(userIdentifier, validated.streamId, userRole)) {
        const remaining = this.slowModeManager.getRemainingSlowModeTime(
          userIdentifier,
          validated.streamId,
        );
        socket.emit('error', {
          message: `Slow mode is enabled. Wait ${Math.ceil(remaining)} seconds.`,
          slowModeRemaining: Math.ceil(remaining),
        });
        return;
      }

      // Check if user is timed out or banned (only for authenticated users)
      if (socket.userId) {
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
      }

      // For anonymous users, don't save to database
      let chatMessage;
      
      if (socket.userId) {
        // Create message in database for authenticated users
        const message = await this.prisma.streamMessage.create({
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
        
        console.log(`[CHAT DEBUG] 🔍 User lookup result for userId ${socket.userId}:`, user);

        // Format message for broadcast
        chatMessage = {
          id: message.id,
          content: message.content,
          userId: user?.id || socket.userId,
          username: user?.username || socket.username || 'omi-live chatter',
          avatarUrl: user?.avatarUrl || null,
          role: user?.role || 'viewer',
          streamId: validated.streamId,
          timestamp: message.createdAt,
          replyTo: validated.replyTo,
          type: 'message' as const,
        };
        
        console.log(`[CHAT DEBUG] 📤 Sending message with username: "${chatMessage.username}" (from user.username: "${user?.username}", socket.username: "${socket.username}")`);
      } else {
        // For anonymous users, create message without database
        chatMessage = {
          id: `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: validated.content,
          userId: `anon-${socket.id}`,
          username: socket.username || 'omi-live chatter',
          avatarUrl: null,
          role: 'viewer',
          streamId: validated.streamId,
          timestamp: new Date(),
          replyTo: validated.replyTo,
          type: 'message' as const,
        };
      }

      // Broadcast to all users in the stream (excluding sender)
      console.log(`[CHAT] ${socket.username || 'anonymous'}(${socket.id}) sending to room stream:${validated.streamId}: "${validated.content}"`);
      socket.to(`stream:${validated.streamId}`).emit('chat:message', chatMessage);
      socket.emit('chat:message:sent', chatMessage);
      
      // Check who's in the room
      const isInRoom = socket.rooms.has(`stream:${validated.streamId}`);
      console.log(`[CHAT] Sender is in room: ${isInRoom}, socket rooms:`, Array.from(socket.rooms));
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
      const validated = chatDeleteMessageSchema.parse(data);

      // Get message to check ownership
      const message = await this.prisma.streamMessage.findUnique({
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
      await this.prisma.streamMessage.delete({
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
      const validated = chatModerateUserSchema.parse(data);

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

      // Send system message for moderation action
      await this.chatIntegration.sendModerationMessage(
        validated.streamId,
        validated.action,
        moderation.user.username,
        socket.username || 'Moderator',
        {
          reason: validated.reason,
          duration: validated.duration
        }
      );

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

      const messages = await this.prisma.streamMessage.findMany({
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
      const validated = chatReactSchema.parse(data);

      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required to react to messages' });
        return;
      }

      // Check if message exists
      const message = await this.prisma.streamMessage.findUnique({
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
      const validated = chatPinMessageSchema.parse(data);

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
        await this.prisma.streamMessage.updateMany({
          where: {
            streamId: validated.streamId,
            isPinned: true,
          },
          data: { isPinned: false },
        });

        // Pin the new message
        const message = await this.prisma.streamMessage.update({
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
        await this.prisma.streamMessage.update({
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

  // Handle stream commands in chat
  handleStreamCommand = async (
    socket: SocketWithAuth,
    streamId: string,
    message: string,
  ): Promise<boolean> => {
    // Check if message is a stream command
    if (!StreamCommandParser.isCommand(message)) {
      return false;
    }

    const parsed = StreamCommandParser.parseCommand(message);
    if (!parsed) {
      return false;
    }

    const command = StreamCommandParser.findCommand(parsed.command);
    if (!command) {
      // Not a recognized stream command, let other handlers process it
      return false;
    }

    // Create command context
    const context: CommandContext = {
      streamId,
      userId: socket.userId || '',
      username: socket.username || 'Anonymous',
      userRole: socket.role || 'viewer',
      isAuthenticated: !!socket.userId,
      socketId: socket.id
    };

    // Check permissions
    const permissionCheck = StreamCommandParser.canExecuteCommand(
      command,
      context.userRole,
      context.isAuthenticated
    );

    if (!permissionCheck.canExecute) {
      socket.emit('error', { 
        message: permissionCheck.reason,
        command: command.name 
      });

      // Send system message about failed command
      await this.chatIntegration.sendCustomSystemMessage(
        streamId,
        `❌ Command failed: ${permissionCheck.reason}`,
        { priority: 'low', saveToDatabase: false }
      );

      return true;
    }

    // Validate parameters
    const paramValidation = StreamCommandParser.validateParameters(command, parsed.args);
    if (!paramValidation.isValid) {
      const errorMessage = paramValidation.errors?.join(', ') || 'Invalid parameters';
      
      socket.emit('error', { 
        message: errorMessage,
        command: command.name,
        usage: command.usage
      });

      // Send system message about invalid parameters
      await this.chatIntegration.sendCustomSystemMessage(
        streamId,
        `❌ ${command.usage} - ${errorMessage}`,
        { priority: 'low', saveToDatabase: false }
      );

      return true;
    }

    try {
      // Execute the command
      const result = await this.executeStreamCommand(command, parsed.args, context);

      if (result.success) {
        // Send success system message if provided
        if (result.message) {
          await this.chatIntegration.sendCustomSystemMessage(
            streamId,
            `✅ ${result.message}`,
            { 
              priority: 'medium', 
              metadata: { 
                command: command.name,
                executor: context.username,
                result: result.data 
              }
            }
          );
        }

        // Send success response to user
        socket.emit('stream:command:success', {
          command: command.name,
          message: result.message,
          data: result.data
        });
      } else {
        // Send error system message
        await this.chatIntegration.sendCustomSystemMessage(
          streamId,
          `❌ Command failed: ${result.error || 'Unknown error'}`,
          { priority: 'low', saveToDatabase: false }
        );

        socket.emit('error', { 
          message: result.error || 'Command execution failed',
          command: command.name 
        });
      }

    } catch (error) {
      console.error('Error executing stream command:', error);
      
      socket.emit('error', { 
        message: 'Internal error executing command',
        command: command.name 
      });

      await this.chatIntegration.sendCustomSystemMessage(
        streamId,
        `❌ Command error: Internal server error`,
        { priority: 'low', saveToDatabase: false }
      );
    }

    return true;
  };

  // Execute specific stream commands
  private async executeStreamCommand(
    command: any,
    args: string[],
    context: CommandContext
  ): Promise<CommandExecutionResult> {
    switch (command.type) {
      case 'help':
        return this.executeHelpCommand(args[0], context);
      
      case 'stats':
        return this.executeStatsCommand(context);
      
      case 'quality':
        return this.executeQualityCommand(args[0], context);
      
      case 'feature':
        return this.executeFeatureCommand(args[0], context);
      
      case 'unfeature':
        return this.executeUnfeatureCommand(context);
      
      case 'record':
        return this.executeRecordCommand(args[0], context);
      
      case 'volume':
        return this.executeVolumeCommand(args[0], context);
      
      case 'snapshot':
        return this.executeSnapshotCommand(context);
      
      default:
        return {
          success: false,
          error: `Command '${command.name}' is not yet implemented`
        };
    }
  }

  // Command implementations
  private async executeHelpCommand(
    commandName: string | undefined,
    context: CommandContext
  ): Promise<CommandExecutionResult> {
    if (commandName) {
      const command = StreamCommandParser.findCommand(commandName);
      if (!command) {
        return {
          success: false,
          error: `Unknown command: ${commandName}`
        };
      }

      const helpText = StreamCommandParser.getCommandHelp(command);
      return {
        success: true,
        message: helpText
      };
    } else {
      const helpText = StreamCommandParser.getAvailableCommands(
        context.userRole,
        context.isAuthenticated
      );
      return {
        success: true,
        message: helpText
      };
    }
  }

  private async executeStatsCommand(context: CommandContext): Promise<CommandExecutionResult> {
    try {
      const room = this.roomManager.getRoomInfo(context.streamId);
      const viewerCount = room?.viewers.size || 0;
      
      // Get additional stats from database
      const stream = await this.prisma.stream.findUnique({
        where: { id: context.streamId },
        select: {
          title: true,
          createdAt: true,
          isLive: true,
          slowModeDelay: true
        }
      });

      if (!stream) {
        return {
          success: false,
          error: 'Stream not found'
        };
      }

      const uptime = stream.createdAt ? 
        Math.floor((Date.now() - stream.createdAt.getTime()) / 1000) : 0;
      
      const stats = [
        `📊 **Stream Statistics**`,
        `👥 Viewers: ${viewerCount}`,
        `⏱️ Uptime: ${this.formatDuration(uptime)}`,
        `🎬 Status: ${stream.isLive ? 'Live' : 'Offline'}`,
        `🐌 Slow Mode: ${stream.slowModeDelay > 0 ? `${stream.slowModeDelay}s` : 'Disabled'}`
      ].join('\n');

      return {
        success: true,
        message: stats,
        data: {
          viewerCount,
          uptime,
          isLive: stream.isLive,
          slowModeDelay: stream.slowModeDelay
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve stats'
      };
    }
  }

  private async executeQualityCommand(
    quality: string | undefined,
    context: CommandContext
  ): Promise<CommandExecutionResult> {
    const validQualities = ['auto', '1080p', '720p', '480p', '360p'];
    
    if (!quality) {
      return {
        success: true,
        message: `Available qualities: ${validQualities.join(', ')}`
      };
    }

    if (!validQualities.includes(quality.toLowerCase())) {
      return {
        success: false,
        error: `Invalid quality. Use: ${validQualities.join(', ')}`
      };
    }

    // Emit quality change to VDO.ninja integration
    // This would be handled by the VDO integration
    return {
      success: true,
      message: `Quality changed to ${quality}`,
      data: { quality }
    };
  }

  private async executeFeatureCommand(
    productId: string,
    context: CommandContext
  ): Promise<CommandExecutionResult> {
    if (!productId) {
      return {
        success: false,
        error: 'Product ID is required'
      };
    }

    try {
      // Find the product
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true }
      });

      if (!product) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      // Feature the product (this would integrate with the product system)
      // For now, just send a system message
      return {
        success: true,
        message: `Now featuring: ${product.name}`,
        data: { productId, productName: product.name }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to feature product'
      };
    }
  }

  private async executeUnfeatureCommand(context: CommandContext): Promise<CommandExecutionResult> {
    return {
      success: true,
      message: 'Featured product removed'
    };
  }

  private async executeRecordCommand(
    action: string | undefined,
    context: CommandContext
  ): Promise<CommandExecutionResult> {
    const validActions = ['start', 'stop'];
    
    if (action && !validActions.includes(action.toLowerCase())) {
      return {
        success: false,
        error: `Invalid action. Use: ${validActions.join(', ')}`
      };
    }

    const recordAction = action?.toLowerCase() || 'toggle';
    
    return {
      success: true,
      message: `Recording ${recordAction === 'start' ? 'started' : recordAction === 'stop' ? 'stopped' : 'toggled'}`,
      data: { action: recordAction }
    };
  }

  private async executeVolumeCommand(
    level: string,
    context: CommandContext
  ): Promise<CommandExecutionResult> {
    const volume = parseInt(level);
    
    if (isNaN(volume) || volume < 0 || volume > 100) {
      return {
        success: false,
        error: 'Volume must be between 0 and 100'
      };
    }

    return {
      success: true,
      message: `Volume set to ${volume}%`,
      data: { volume }
    };
  }

  private async executeSnapshotCommand(context: CommandContext): Promise<CommandExecutionResult> {
    return {
      success: true,
      message: 'Snapshot captured',
      data: { timestamp: new Date().toISOString() }
    };
  }

  // Helper method to format duration
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Handle slow mode toggle
  handleSlowMode = async (socket: SocketWithAuth, data: any) => {
    try {
      const validated = chatSlowModeSchema.parse(data);

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

        // Send system message for slow mode enabled
        await this.chatIntegration.sendSlowModeMessage(
          validated.streamId,
          true,
          delay,
          socket.username || 'Moderator'
        );
      } else {
        this.slowModeManager.disableSlowMode(validated.streamId);

        // Update in database
        await this.prisma.stream.update({
          where: { id: validated.streamId },
          data: { slowModeDelay: 0 },
        });

        socket.to(`stream:${validated.streamId}`).emit('chat:slowmode:disabled');
        socket.emit('chat:slowmode:success', { enabled: false });

        // Send system message for slow mode disabled
        await this.chatIntegration.sendSlowModeMessage(
          validated.streamId,
          false,
          0,
          socket.username || 'Moderator'
        );
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

  // Enhanced rate-limited handlers using the new system
  handleSendMessageEnhanced = createEnhancedRateLimitedHandler(
    'chat:message',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleSendMessage(socket, data);
    }
  );

  handleDeleteMessageEnhanced = createEnhancedRateLimitedHandler(
    'chat:delete',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleDeleteMessage(socket, data);
    }
  );

  handleModerateUserEnhanced = createEnhancedRateLimitedHandler(
    'chat:moderate',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleModerateUser(socket, data);
    }
  );

  handleTypingEnhanced = createEnhancedRateLimitedHandler(
    'chat:typing',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleTyping(socket, data);
    }
  );

  handleReactToMessageEnhanced = createEnhancedRateLimitedHandler(
    'chat:reaction',
    async (socket: SocketWithAuth, data: any) => {
      await this.handleReactToMessage(socket, data);
    }
  );

  /**
   * Get rate limit status for a user
   */
  async getRateLimitStatus(
    socket: SocketWithAuth,
    eventType: string
  ): Promise<void> {
    if (!socket.userId) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const status = await this.enhancedRateLimiter.getLimitStatus(
        eventType,
        socket.userId,
        socket.role || 'viewer'
      );

      socket.emit('rate_limit_status', {
        eventType,
        ...status,
      });
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      socket.emit('error', { message: 'Failed to get rate limit status' });
    }
  }

  /**
   * Admin method to reset rate limits for a user
   */
  async resetUserRateLimits(
    socket: SocketWithAuth,
    data: { userId: string; eventType?: string }
  ): Promise<void> {
    // Check admin permissions
    if (socket.role !== 'admin') {
      socket.emit('error', { message: 'Admin permissions required' });
      return;
    }

    try {
      await this.enhancedRateLimiter.resetLimits(data.userId, data.eventType);
      
      socket.emit('admin:rate_limit_reset:success', {
        userId: data.userId,
        eventType: data.eventType || 'all',
      });

      console.log(`Rate limits reset by admin ${socket.userId} for user ${data.userId}, event: ${data.eventType || 'all'}`);
    } catch (error) {
      console.error('Error resetting rate limits:', error);
      socket.emit('error', { message: 'Failed to reset rate limits' });
    }
  }

  /**
   * Get rate limiting statistics (admin only)
   */
  async getRateLimitStats(socket: SocketWithAuth): Promise<void> {
    if (socket.role !== 'admin') {
      socket.emit('error', { message: 'Admin permissions required' });
      return;
    }

    try {
      const stats = await this.enhancedRateLimiter.getStats();
      socket.emit('admin:rate_limit_stats', stats);
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      socket.emit('error', { message: 'Failed to get rate limit statistics' });
    }
  }
}
