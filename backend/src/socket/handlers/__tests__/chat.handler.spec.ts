import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../config/prisma.config';
import { SocketWithAuth } from '../../../config/socket/socket.config';
import { ChatRateLimiter, SlowModeManager } from '../../managers/rate-limiter';
import { RoomManager } from '../../managers/room.manager';
import { ChatHandler } from '../chat.handler';

// Mock all dependencies
vi.mock('../../managers/room.manager');
vi.mock('../../managers/rate-limiter');
vi.mock('../../../config/prisma.config');
vi.mock('../chat-commands');

// Helper to generate valid UUID v4
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

describe('ChatHandler', () => {
  let chatHandler: ChatHandler;
  let mockSocket: SocketWithAuth;
  let mockPrisma: any;
  let mockRoomManager: any;
  let mockRateLimiter: any;
  let mockSlowModeManager: any;
  let mockCommandHandler: any;

  // Generate consistent UUIDs for testing
  const streamId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '223e4567-e89b-12d3-a456-426614174000';
  const messageId = '323e4567-e89b-12d3-a456-426614174000';
  const otherUserId = '423e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock socket
    mockSocket = {
      id: 'socket-123',
      userId: userId,
      username: 'testuser',
      role: 'viewer',
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
      join: vi.fn(),
      leave: vi.fn(),
      disconnect: vi.fn(),
    } as any;

    // Mock command handler
    mockCommandHandler = {
      processCommand: vi.fn().mockResolvedValue(false), // Don't process as command by default
    };

    // Mock Prisma
    mockPrisma = {
      comment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findFirst: vi.fn(),
      },
      chatModeration: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      stream: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      messageReaction: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    // Mock RoomManager
    mockRoomManager = {
      getRoomInfo: vi.fn().mockReturnValue({
        streamId: streamId,
        viewers: new Set(['socket-123']),
        viewerCount: 1,
      }),
      isModerator: vi.fn().mockReturnValue(false),
    };

    // Mock RateLimiter
    mockRateLimiter = {
      isInCooldown: vi.fn().mockReturnValue(false),
      canSendMessage: vi.fn().mockReturnValue(true),
      getResetTime: vi.fn().mockReturnValue(0),
    };

    // Mock SlowModeManager
    mockSlowModeManager = {
      canSendInSlowMode: vi.fn().mockReturnValue(true),
      getRemainingSlowModeTime: vi.fn().mockReturnValue(0),
      enableSlowMode: vi.fn(),
      disableSlowMode: vi.fn(),
    };

    // Setup mocks
    (RoomManager.getInstance as any).mockReturnValue(mockRoomManager);
    (ChatRateLimiter.getInstance as any).mockReturnValue(mockRateLimiter);
    (SlowModeManager.getInstance as any).mockReturnValue(mockSlowModeManager);
    (PrismaService.getInstance as any).mockReturnValue({ client: mockPrisma });

    chatHandler = new ChatHandler();
    // Inject mock command handler
    (chatHandler as any).commandHandler = mockCommandHandler;
  });

  describe('handleSendMessage', () => {
    const validMessageData = {
      streamId: streamId,
      content: 'Hello world!',
    };

    it('should send a message successfully', async () => {
      const mockCreatedMessage = {
        id: messageId,
        content: 'Hello world!',
        createdAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
          role: { name: 'viewer' },
        },
        _count: {
          reactions: 0,
        },
      };

      mockPrisma.comment.create.mockResolvedValue(mockCreatedMessage);
      mockPrisma.chatModeration.findFirst.mockResolvedValue(null);

      await chatHandler.handleSendMessage(mockSocket, validMessageData);

      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Hello world!',
          userId: userId,
          streamId: streamId,
          replyToId: undefined,
        },
        include: expect.any(Object),
      });

      expect(mockSocket.to).toHaveBeenCalledWith(`stream:${streamId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'chat:message:sent',
        expect.objectContaining({
          id: messageId,
          content: 'Hello world!',
          username: 'testuser',
        }),
      );
    });

    it('should process commands', async () => {
      mockCommandHandler.processCommand.mockResolvedValue(true); // This is a command

      await chatHandler.handleSendMessage(mockSocket, {
        streamId: streamId,
        content: '/help',
      });

      expect(mockCommandHandler.processCommand).toHaveBeenCalledWith(mockSocket, streamId, '/help');
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated users', async () => {
      mockSocket.userId = undefined;

      await chatHandler.handleSendMessage(mockSocket, validMessageData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication required to send messages',
      });
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });

    it('should reject users not in the room', async () => {
      mockRoomManager.getRoomInfo.mockReturnValue({
        streamId: streamId,
        viewers: new Set(['other-socket']),
        viewerCount: 1,
      });

      await chatHandler.handleSendMessage(mockSocket, validMessageData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'You must join the stream to send messages',
      });
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      mockRateLimiter.isInCooldown.mockReturnValue(true);
      mockRateLimiter.getResetTime.mockReturnValue(5000);

      await chatHandler.handleSendMessage(mockSocket, validMessageData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'You are in cooldown. Please wait.',
        cooldownRemaining: 5,
      });
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });

    it('should enforce slow mode', async () => {
      mockSlowModeManager.canSendInSlowMode.mockReturnValue(false);
      mockSlowModeManager.getRemainingSlowModeTime.mockReturnValue(10);

      await chatHandler.handleSendMessage(mockSocket, validMessageData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Slow mode is enabled. Wait 10 seconds.',
        slowModeRemaining: 10,
      });
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });

    it('should reject banned users', async () => {
      mockPrisma.chatModeration.findFirst.mockResolvedValue({
        action: 'ban',
        expiresAt: null,
      });

      await chatHandler.handleSendMessage(mockSocket, validMessageData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'You are banned from this chat',
      });
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });

    it('should reject timed out users', async () => {
      const expiresAt = new Date(Date.now() + 60000); // 60 seconds from now
      mockPrisma.chatModeration.findFirst.mockResolvedValue({
        action: 'timeout',
        expiresAt,
      });

      await chatHandler.handleSendMessage(mockSocket, validMessageData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: expect.stringContaining('You are timed out for'),
        timeoutRemaining: expect.any(Number),
      });
      expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteMessage', () => {
    it('should allow message owner to delete their message', async () => {
      const mockMessage = {
        userId: userId,
        streamId: streamId,
      };

      mockPrisma.comment.findUnique.mockResolvedValue(mockMessage);

      await chatHandler.handleDeleteMessage(mockSocket, {
        streamId: streamId,
        messageId: messageId,
      });

      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({
        where: { id: messageId },
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:message:deleted', {
        messageId: messageId,
        deletedBy: userId,
      });
    });

    it('should allow moderators to delete any message', async () => {
      const mockMessage = {
        userId: otherUserId,
        streamId: streamId,
      };

      mockPrisma.comment.findUnique.mockResolvedValue(mockMessage);
      mockRoomManager.isModerator.mockReturnValue(true);

      await chatHandler.handleDeleteMessage(mockSocket, {
        streamId: streamId,
        messageId: messageId,
      });

      expect(mockPrisma.comment.delete).toHaveBeenCalled();
    });

    it('should reject non-owners trying to delete others messages', async () => {
      const mockMessage = {
        userId: otherUserId,
        streamId: streamId,
      };

      mockPrisma.comment.findUnique.mockResolvedValue(mockMessage);
      mockRoomManager.isModerator.mockReturnValue(false);

      await chatHandler.handleDeleteMessage(mockSocket, {
        streamId: streamId,
        messageId: messageId,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Insufficient permissions',
      });
      expect(mockPrisma.comment.delete).not.toHaveBeenCalled();
    });
  });

  describe('handleModerateUser', () => {
    beforeEach(() => {
      mockRoomManager.isModerator.mockReturnValue(true);
    });

    it('should timeout a user', async () => {
      const streamerId = '523e4567-e89b-12d3-a456-426614174000';
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamerId });
      mockPrisma.chatModeration.create.mockResolvedValue({
        user: { username: 'baduser' },
      });
      // Mock that the user being moderated is not a moderator
      const originalIsModerator = mockRoomManager.isModerator;
      mockRoomManager.isModerator.mockImplementation((streamId, userId) => {
        return userId === mockSocket.userId; // Only the socket user is a moderator
      });

      await chatHandler.handleModerateUser(mockSocket, {
        streamId: streamId,
        userId: otherUserId,
        action: 'timeout',
        duration: 300,
        reason: 'Spamming',
      });

      // Restore original mock
      mockRoomManager.isModerator = originalIsModerator;

      expect(mockPrisma.chatModeration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'timeout',
          duration: 300,
          expiresAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:moderation:success', expect.any(Object));
    });

    it('should ban a user', async () => {
      const streamerId = '523e4567-e89b-12d3-a456-426614174000';
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamerId });
      mockPrisma.chatModeration.create.mockResolvedValue({
        user: { username: 'baduser' },
      });
      // Mock that the user being moderated is not a moderator
      const originalIsModerator = mockRoomManager.isModerator;
      mockRoomManager.isModerator.mockImplementation((streamId, userId) => {
        return userId === mockSocket.userId; // Only the socket user is a moderator
      });

      await chatHandler.handleModerateUser(mockSocket, {
        streamId: streamId,
        userId: otherUserId,
        action: 'ban',
        reason: 'Hate speech',
      });

      // Restore original mock
      mockRoomManager.isModerator = originalIsModerator;

      expect(mockPrisma.chatModeration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ban',
          expiresAt: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should reject non-moderators', async () => {
      mockRoomManager.isModerator.mockReturnValue(false);

      await chatHandler.handleModerateUser(mockSocket, {
        streamId: streamId,
        userId: otherUserId,
        action: 'timeout',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Moderator permissions required',
      });
      expect(mockPrisma.chatModeration.create).not.toHaveBeenCalled();
    });

    it('should prevent moderating stream owner', async () => {
      const ownerId = '623e4567-e89b-12d3-a456-426614174000';
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: ownerId });

      await chatHandler.handleModerateUser(mockSocket, {
        streamId: streamId,
        userId: ownerId,
        action: 'ban',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Cannot moderate the stream owner',
      });
    });
  });

  describe('handleReactToMessage', () => {
    it('should add a reaction', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ streamId: streamId });
      mockPrisma.messageReaction.findUnique.mockResolvedValue(null);
      mockPrisma.messageReaction.groupBy.mockResolvedValue([{ emoji: '👍', _count: 5 }]);

      await chatHandler.handleReactToMessage(mockSocket, {
        messageId: messageId,
        emoji: '👍',
      });

      expect(mockPrisma.messageReaction.create).toHaveBeenCalledWith({
        data: {
          messageId: messageId,
          userId: userId,
          emoji: '👍',
        },
      });

      expect(mockSocket.to).toHaveBeenCalledWith(`stream:${streamId}`);
    });

    it('should remove existing reaction', async () => {
      const reactionId = '723e4567-e89b-12d3-a456-426614174000';
      mockPrisma.comment.findUnique.mockResolvedValue({ streamId: streamId });
      mockPrisma.messageReaction.findUnique.mockResolvedValue({ id: reactionId });

      await chatHandler.handleReactToMessage(mockSocket, {
        messageId: messageId,
        emoji: '👍',
      });

      expect(mockPrisma.messageReaction.delete).toHaveBeenCalledWith({
        where: { id: reactionId },
      });
    });
  });

  describe('handlePinMessage', () => {
    it('should pin a message', async () => {
      mockRoomManager.isModerator.mockReturnValue(true);
      mockPrisma.comment.update.mockResolvedValue({
        id: messageId,
        content: 'Important message',
        createdAt: new Date(),
        user: {
          id: userId,
          username: 'testuser',
          avatarUrl: null,
        },
      });

      await chatHandler.handlePinMessage(mockSocket, {
        streamId: streamId,
        messageId: messageId,
        pin: true,
      });

      expect(mockPrisma.comment.updateMany).toHaveBeenCalledWith({
        where: {
          streamId: streamId,
          isPinned: true,
        },
        data: { isPinned: false },
      });

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { isPinned: true },
        include: expect.any(Object),
      });
    });

    it('should require moderator permissions', async () => {
      mockRoomManager.isModerator.mockReturnValue(false);
      const otherStreamerId = '823e4567-e89b-12d3-a456-426614174000';
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: otherStreamerId });

      await chatHandler.handlePinMessage(mockSocket, {
        streamId: streamId,
        messageId: messageId,
        pin: true,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Moderator permissions required to pin messages',
      });
    });
  });

  describe('handleSlowMode', () => {
    it('should enable slow mode', async () => {
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: userId });

      await chatHandler.handleSlowMode(mockSocket, {
        streamId: streamId,
        enabled: true,
        delay: 60,
      });

      expect(mockSlowModeManager.enableSlowMode).toHaveBeenCalledWith(streamId, 60);
      expect(mockPrisma.stream.update).toHaveBeenCalledWith({
        where: { id: streamId },
        data: { slowModeDelay: 60 },
      });
    });

    it('should disable slow mode', async () => {
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: userId });

      await chatHandler.handleSlowMode(mockSocket, {
        streamId: streamId,
        enabled: false,
      });

      expect(mockSlowModeManager.disableSlowMode).toHaveBeenCalledWith(streamId);
      expect(mockPrisma.stream.update).toHaveBeenCalledWith({
        where: { id: streamId },
        data: { slowModeDelay: 0 },
      });
    });
  });
});
