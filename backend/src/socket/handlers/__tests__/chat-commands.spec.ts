import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../config/prisma.config';
import { SocketWithAuth } from '../../../config/socket/socket.config';
import { SlowModeManager } from '../../managers/rate-limiter';
import { RoomManager } from '../../managers/room.manager';
import { ChatCommandHandler } from '../chat-commands';

// Mock all dependencies
vi.mock('../../managers/room.manager');
vi.mock('../../managers/rate-limiter');
vi.mock('../../../config/prisma.config');

describe('ChatCommandHandler', () => {
  let commandHandler: ChatCommandHandler;
  let mockSocket: SocketWithAuth;
  let mockPrisma: any;
  let mockRoomManager: any;
  let mockSlowModeManager: any;

  // Consistent UUIDs for testing
  const streamId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '223e4567-e89b-12d3-a456-426614174000';
  const messageId = '323e4567-e89b-12d3-a456-426614174000';
  const badUserId = '423e4567-e89b-12d3-a456-426614174000';
  const streamOwnerId = '523e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock socket
    mockSocket = {
      id: 'socket-123',
      userId: userId,
      username: 'testuser',
      role: 'user',
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
    } as any;

    // Mock Prisma
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      stream: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      comment: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      chatModeration: {
        create: vi.fn(),
      },
      streamModerator: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    // Mock RoomManager
    mockRoomManager = {
      isModerator: vi.fn().mockReturnValue(false),
      addModerator: vi.fn(),
      removeModerator: vi.fn(),
      getViewerCount: vi.fn().mockReturnValue(42),
    };

    // Mock SlowModeManager
    mockSlowModeManager = {
      enableSlowMode: vi.fn(),
      disableSlowMode: vi.fn(),
    };

    // Setup mocks
    (RoomManager.getInstance as any).mockReturnValue(mockRoomManager);
    (SlowModeManager.getInstance as any).mockReturnValue(mockSlowModeManager);
    (PrismaService.getInstance as any).mockReturnValue({ client: mockPrisma });

    commandHandler = new ChatCommandHandler();
  });

  describe('processCommand', () => {
    it('should return false for non-command messages', async () => {
      const result = await commandHandler.processCommand(mockSocket, streamId, 'Hello world');
      expect(result).toBe(false);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle unknown commands', async () => {
      const result = await commandHandler.processCommand(mockSocket, streamId, '/unknowncommand');
      expect(result).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:error', {
        message: 'Unknown command: /unknowncommand',
      });
    });

    it('should execute valid commands', async () => {
      mockRoomManager.getViewerCount.mockReturnValue(100);

      const result = await commandHandler.processCommand(mockSocket, streamId, '/viewers');
      expect(result).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:system:message', {
        content: 'Current viewers: 100',
        type: 'info',
      });
    });
  });

  describe('timeout command', () => {
    beforeEach(() => {
      // By default, the test user is a moderator
      mockRoomManager.isModerator.mockReturnValue(true);
      // And the stream is owned by someone else
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamOwnerId });
    });

    it('should timeout a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: badUserId });

      await commandHandler.processCommand(mockSocket, streamId, '/timeout baduser 300 spamming');

      expect(mockPrisma.chatModeration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: badUserId,
          action: 'timeout',
          duration: 300,
          reason: 'spamming',
          expiresAt: expect.any(Date),
        }),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:success', {
        message: 'baduser has been timed out for 300 seconds',
      });
    });

    it('should reject non-moderators', async () => {
      // Setup: user is not a moderator and not the stream owner
      mockRoomManager.isModerator.mockReturnValue(false);
      // Stream owner is different from socket user
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamOwnerId });

      await commandHandler.processCommand(mockSocket, streamId, '/timeout baduser 300');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:error', {
        message: 'Moderator permissions required',
      });
      // The command should fail at permission check, so it shouldn't look up the user
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.chatModeration.create).not.toHaveBeenCalled();
    });

    it('should validate duration', async () => {
      await commandHandler.processCommand(mockSocket, streamId, '/timeout baduser invalid');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:error', {
        message: 'Invalid duration',
      });
    });

    it('should show usage when missing parameters', async () => {
      await commandHandler.processCommand(mockSocket, streamId, '/timeout');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:usage', {
        message: 'Usage: /timeout <username> <seconds> [reason]',
      });
    });
  });

  describe('ban command', () => {
    beforeEach(() => {
      mockRoomManager.isModerator.mockReturnValue(true);
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamOwnerId });
    });

    it('should ban a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: badUserId });

      await commandHandler.processCommand(mockSocket, streamId, '/ban baduser hate speech');

      expect(mockPrisma.chatModeration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: badUserId,
          action: 'ban',
          reason: 'hate speech',
          expiresAt: null,
        }),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:success', {
        message: 'baduser has been banned',
      });
    });
  });

  describe('slowmode command', () => {
    beforeEach(() => {
      mockRoomManager.isModerator.mockReturnValue(true);
    });

    it('should enable slow mode with default delay', async () => {
      await commandHandler.processCommand(mockSocket, streamId, '/slowmode');

      expect(mockSlowModeManager.enableSlowMode).toHaveBeenCalledWith(streamId, 30);
      expect(mockPrisma.stream.update).toHaveBeenCalledWith({
        where: { id: streamId },
        data: { slowModeDelay: 30 },
      });
    });

    it('should enable slow mode with custom delay', async () => {
      await commandHandler.processCommand(mockSocket, streamId, '/slowmode 60');

      expect(mockSlowModeManager.enableSlowMode).toHaveBeenCalledWith(streamId, 60);
    });

    it('should disable slow mode', async () => {
      await commandHandler.processCommand(mockSocket, streamId, '/slowmode 0');

      expect(mockSlowModeManager.disableSlowMode).toHaveBeenCalledWith(streamId);
      expect(mockPrisma.stream.update).toHaveBeenCalledWith({
        where: { id: streamId },
        data: { slowModeDelay: 0 },
      });
    });

    it('should validate delay range', async () => {
      await commandHandler.processCommand(mockSocket, streamId, '/slowmode 500');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:error', {
        message: 'Delay must be between 0-300 seconds',
      });
    });
  });

  describe('pin command', () => {
    beforeEach(() => {
      mockRoomManager.isModerator.mockReturnValue(true);
    });

    it('should pin a message', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: messageId,
        content: 'Important message',
        streamId: streamId,
        user: {
          id: userId,
          username: 'author',
          avatarUrl: null,
        },
      });

      await commandHandler.processCommand(mockSocket, streamId, `/pin ${messageId}`);

      expect(mockPrisma.comment.updateMany).toHaveBeenCalled();
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { isPinned: true },
      });
    });

    it('should reject invalid message', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await commandHandler.processCommand(mockSocket, streamId, '/pin invalid-id');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:error', {
        message: 'Message not found',
      });
    });
  });

  describe('mod command', () => {
    it('should add a moderator as stream owner', async () => {
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: userId });
      mockPrisma.user.findUnique.mockResolvedValue({ id: badUserId });

      await commandHandler.processCommand(mockSocket, streamId, '/mod newmod');

      expect(mockPrisma.streamModerator.create).toHaveBeenCalledWith({
        data: {
          streamId: streamId,
          userId: badUserId,
          addedBy: userId,
        },
      });

      expect(mockRoomManager.addModerator).toHaveBeenCalledWith(streamId, badUserId);
    });

    it('should reject non-owners', async () => {
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamOwnerId });
      mockSocket.role = 'viewer';

      await commandHandler.processCommand(mockSocket, streamId, '/mod newmod');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:error', {
        message: 'Only stream owner can add moderators',
      });
    });
  });

  describe('help command', () => {
    it('should show basic commands to viewers', async () => {
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamOwnerId });

      await commandHandler.processCommand(mockSocket, streamId, '/help');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:system:message', {
        content: expect.stringContaining('/help'),
        type: 'help',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:system:message', {
        content: expect.not.stringContaining('/timeout'),
        type: 'help',
      });
    });

    it('should show moderator commands to moderators', async () => {
      mockRoomManager.isModerator.mockReturnValue(true);
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: streamOwnerId });

      await commandHandler.processCommand(mockSocket, streamId, '/help');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:system:message', {
        content: expect.stringContaining('/timeout'),
        type: 'help',
      });
    });
  });

  describe('uptime command', () => {
    it('should show stream uptime', async () => {
      const startedAt = new Date(Date.now() - 3661000); // 1 hour, 1 minute, 1 second ago
      mockPrisma.stream.findUnique.mockResolvedValue({
        isLive: true,
        startedAt,
      });

      await commandHandler.processCommand(mockSocket, streamId, '/uptime');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:system:message', {
        content: expect.stringMatching(/Stream uptime: \d+h \d+m \d+s/),
        type: 'info',
      });
    });

    it('should handle offline streams', async () => {
      mockPrisma.stream.findUnique.mockResolvedValue({
        isLive: false,
        startedAt: null,
      });

      await commandHandler.processCommand(mockSocket, streamId, '/uptime');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:system:message', {
        content: 'Stream is not live',
        type: 'info',
      });
    });
  });

  describe('clear command', () => {
    beforeEach(() => {
      mockRoomManager.isModerator.mockReturnValue(true);
    });

    it('should clear chat messages', async () => {
      await commandHandler.processCommand(mockSocket, streamId, '/clear');

      expect(mockPrisma.comment.updateMany).toHaveBeenCalledWith({
        where: {
          streamId: streamId,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      });

      expect(mockSocket.to).toHaveBeenCalledWith(`stream:${streamId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:success', {
        message: 'Chat cleared',
      });
    });
  });

  describe('unban command', () => {
    beforeEach(() => {
      mockRoomManager.isModerator.mockReturnValue(true);
    });

    it('should unban a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: badUserId });

      await commandHandler.processCommand(mockSocket, streamId, '/unban baduser');

      expect(mockPrisma.chatModeration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: badUserId,
          action: 'unban',
        }),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:success', {
        message: 'baduser has been unbanned',
      });
    });
  });

  describe('unpin command', () => {
    beforeEach(() => {
      mockRoomManager.isModerator.mockReturnValue(true);
    });

    it('should unpin a message', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({
        id: messageId,
        streamId: streamId,
        isPinned: true,
      });

      await commandHandler.processCommand(mockSocket, streamId, '/unpin');

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { isPinned: false },
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:success', {
        message: 'Message unpinned',
      });
    });

    it('should handle no pinned message', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await commandHandler.processCommand(mockSocket, streamId, '/unpin');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:command:error', {
        message: 'No pinned message',
      });
    });
  });

  describe('unmod command', () => {
    it('should remove moderator as stream owner', async () => {
      mockPrisma.stream.findUnique.mockResolvedValue({ userId: userId });
      mockPrisma.user.findUnique.mockResolvedValue({ id: badUserId });

      await commandHandler.processCommand(mockSocket, streamId, '/unmod moduser');

      expect(mockPrisma.streamModerator.deleteMany).toHaveBeenCalledWith({
        where: {
          streamId: streamId,
          userId: badUserId,
        },
      });

      expect(mockRoomManager.removeModerator).toHaveBeenCalledWith(streamId, badUserId);
    });
  });

  describe('viewers command', () => {
    it('should show viewer count', async () => {
      mockRoomManager.getViewerCount.mockReturnValue(123);

      await commandHandler.processCommand(mockSocket, streamId, '/viewers');

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:system:message', {
        content: 'Current viewers: 123',
        type: 'info',
      });
    });
  });
});
