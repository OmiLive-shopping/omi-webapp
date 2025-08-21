import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';

// Mock the repository
vi.mock('../repositories/user.repository');

describe('UserService - Stream Key Management', () => {
  let userService: UserService;
  let mockUserRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepository = {
      findUserById: vi.fn(),
      regenerateStreamKey: vi.fn(),
    };

    vi.mocked(UserRepository).mockImplementation(() => mockUserRepository);
    userService = new UserService(mockUserRepository);
  });

  describe('getStreamKey', () => {
    it('should return stream key for streamer user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'teststreamer',
        streamKey: 'test-stream-key-123',
        role: { name: 'streamer' },
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await userService.getStreamKey('user-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Stream key retrieved successfully');
      expect(result.data).toEqual({
        streamKey: 'test-stream-key-123',
        vdoRoomName: 'omi-test-stream-key-123',
      });
    });

    it('should return stream key for admin user', async () => {
      const mockUser = {
        id: 'admin-123',
        username: 'testadmin',
        streamKey: 'admin-stream-key-456',
        role: { name: 'admin' },
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await userService.getStreamKey('admin-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        streamKey: 'admin-stream-key-456',
        vdoRoomName: 'omi-admin-stream-key-456',
      });
    });

    it('should return error for non-streamer user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        streamKey: 'user-stream-key',
        role: { name: 'user' },
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await userService.getStreamKey('user-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Only streamers can access stream keys');
    });

    it('should return error if user not found', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      const result = await userService.getStreamKey('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });

  describe('regenerateStreamKey', () => {
    it('should regenerate stream key for streamer', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'teststreamer',
        streamKey: 'old-stream-key',
        role: { name: 'streamer' },
      };

      const updatedUser = {
        id: 'user-123',
        streamKey: 'new-stream-key-789',
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.regenerateStreamKey.mockResolvedValue(updatedUser);

      const result = await userService.regenerateStreamKey('user-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Stream key regenerated successfully');
      expect(result.data).toEqual({
        streamKey: 'new-stream-key-789',
        vdoRoomName: 'omi-new-stream-key-789',
      });
      expect(mockUserRepository.regenerateStreamKey).toHaveBeenCalledWith('user-123');
    });

    it('should regenerate stream key for admin', async () => {
      const mockUser = {
        id: 'admin-123',
        username: 'testadmin',
        streamKey: 'old-admin-key',
        role: { name: 'admin' },
      };

      const updatedUser = {
        id: 'admin-123',
        streamKey: 'new-admin-key-999',
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.regenerateStreamKey.mockResolvedValue(updatedUser);

      const result = await userService.regenerateStreamKey('admin-123');

      expect(result.success).toBe(true);
      expect(result.data.streamKey).toBe('new-admin-key-999');
    });

    it('should return error for non-streamer user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        streamKey: 'user-key',
        role: { name: 'user' },
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await userService.regenerateStreamKey('user-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Only streamers can regenerate stream keys');
      expect(mockUserRepository.regenerateStreamKey).not.toHaveBeenCalled();
    });

    it('should return error if user not found', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      const result = await userService.regenerateStreamKey('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
      expect(mockUserRepository.regenerateStreamKey).not.toHaveBeenCalled();
    });
  });
});
