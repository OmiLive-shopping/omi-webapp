import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SocketWithAuth } from '../../config/socket/socket.config';
import { RoomManager } from '../managers/room.manager';

// Mock PrismaService
vi.mock('../../config/prisma.config', () => ({
  PrismaService: {
    getInstance: () => ({
      client: {
        stream: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        streamViewer: {
          create: vi.fn(),
          updateMany: vi.fn(),
        },
      },
    }),
  },
}));

describe('RoomManager', () => {
  let roomManager: RoomManager;
  let mockSocket: SocketWithAuth;

  beforeEach(() => {
    roomManager = RoomManager.getInstance();
    // Clear any state from previous tests
    roomManager.clearAll();

    mockSocket = {
      id: 'socket-123',
      userId: 'user-123',
      username: 'testuser',
      role: 'viewer',
      join: vi.fn(),
      leave: vi.fn(),
    } as any;
  });

  describe('Room Creation', () => {
    it('should create a new room', async () => {
      const streamId = 'stream-123';
      await roomManager.createRoom(streamId);

      const roomInfo = roomManager.getRoomInfo(streamId);
      expect(roomInfo).toBeDefined();
      expect(roomInfo?.streamId).toBe(streamId);
      expect(roomInfo?.viewers.size).toBe(0);
      expect(roomInfo?.moderators.size).toBe(0);
    });

    it('should not create duplicate rooms', async () => {
      const streamId = 'stream-123';
      await roomManager.createRoom(streamId);
      const firstRoom = roomManager.getRoomInfo(streamId);

      await roomManager.createRoom(streamId);
      const secondRoom = roomManager.getRoomInfo(streamId);

      expect(firstRoom).toBe(secondRoom);
    });
  });

  describe('Join/Leave Room', () => {
    it('should allow user to join room', async () => {
      const streamId = 'stream-123';
      await roomManager.joinRoom(mockSocket, streamId);

      const roomInfo = roomManager.getRoomInfo(streamId);
      expect(roomInfo?.viewers.has(mockSocket.id)).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith(`stream:${streamId}`);
      expect(mockSocket.join).toHaveBeenCalledWith(`user:${mockSocket.userId}`);
    });

    it('should allow user to leave room', async () => {
      const streamId = 'stream-123';
      await roomManager.joinRoom(mockSocket, streamId);
      await roomManager.leaveRoom(mockSocket, streamId);

      const roomInfo = roomManager.getRoomInfo(streamId);
      expect(roomInfo).toBeUndefined(); // Room should be cleaned up when empty
      expect(mockSocket.leave).toHaveBeenCalledWith(`stream:${streamId}`);
    });

    it('should handle anonymous users', async () => {
      const anonSocket = {
        id: 'anon-socket-123',
        userId: undefined,
        username: undefined,
        role: 'anonymous',
        join: vi.fn(),
        leave: vi.fn(),
      } as any;

      const streamId = 'stream-123';
      await roomManager.joinRoom(anonSocket, streamId);

      const roomInfo = roomManager.getRoomInfo(streamId);
      expect(roomInfo?.viewers.has(anonSocket.id)).toBe(true);
      expect(anonSocket.join).toHaveBeenCalledWith(`stream:${streamId}`);
      expect(anonSocket.join).not.toHaveBeenCalledWith(expect.stringContaining('user:'));
    });
  });

  describe('Viewer Count', () => {
    it('should track viewer count correctly', async () => {
      const streamId = 'stream-123';
      const socket1 = { ...mockSocket, id: 'socket-1' };
      const socket2 = { ...mockSocket, id: 'socket-2' };

      expect(roomManager.getViewerCount(streamId)).toBe(0);

      await roomManager.joinRoom(socket1, streamId);
      expect(roomManager.getViewerCount(streamId)).toBe(1);

      await roomManager.joinRoom(socket2, streamId);
      expect(roomManager.getViewerCount(streamId)).toBe(2);

      await roomManager.leaveRoom(socket1, streamId);
      expect(roomManager.getViewerCount(streamId)).toBe(1);
    });
  });

  describe('Moderator Management', () => {
    it('should add and check moderators', async () => {
      const streamId = 'stream-123';
      const userId = 'mod-user-123';

      // Create room first
      await roomManager.joinRoom(mockSocket, streamId);

      roomManager.addModerator(streamId, userId);
      expect(roomManager.isModerator(streamId, userId)).toBe(true);
      expect(roomManager.isModerator(streamId, 'other-user')).toBe(false);
    });

    it('should remove moderators', async () => {
      const streamId = 'stream-123';
      const userId = 'mod-user-123';

      // Create room first
      await roomManager.joinRoom(mockSocket, streamId);

      roomManager.addModerator(streamId, userId);
      roomManager.removeModerator(streamId, userId);
      expect(roomManager.isModerator(streamId, userId)).toBe(false);
    });
  });

  describe('User Rooms', () => {
    it('should track user rooms', async () => {
      const userId = 'user-123';
      const stream1 = 'stream-1';
      const stream2 = 'stream-2';

      await roomManager.joinRoom({ ...mockSocket, userId }, stream1);
      await roomManager.joinRoom({ ...mockSocket, userId }, stream2);

      const userRooms = roomManager.getUserRooms(userId);
      expect(userRooms).toContain(stream1);
      expect(userRooms).toContain(stream2);
      expect(userRooms).toHaveLength(2);
    });
  });

  describe('Disconnect Handling', () => {
    it('should clean up on disconnect', async () => {
      const stream1 = 'stream-1';
      const stream2 = 'stream-2';

      await roomManager.joinRoom(mockSocket, stream1);
      await roomManager.joinRoom(mockSocket, stream2);

      await roomManager.handleDisconnect(mockSocket);

      expect(roomManager.getViewerCount(stream1)).toBe(0);
      expect(roomManager.getViewerCount(stream2)).toBe(0);
    });
  });

  describe('Active Streams', () => {
    it('should list active streams', async () => {
      const stream1 = 'stream-1';
      const stream2 = 'stream-2';

      await roomManager.joinRoom(mockSocket, stream1);
      await roomManager.joinRoom({ ...mockSocket, id: 'socket-2' }, stream2);

      const activeStreams = roomManager.getActiveStreams();
      expect(activeStreams).toContain(stream1);
      expect(activeStreams).toContain(stream2);
      expect(activeStreams).toHaveLength(2);
    });
  });
});
