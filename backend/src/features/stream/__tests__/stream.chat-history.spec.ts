import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductRepository } from '../../product/repositories/product.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { StreamRepository } from '../repositories/stream.repository.js';
import { StreamService } from '../services/stream.service.js';

vi.mock('../repositories/stream.repository');
vi.mock('../../product/repositories/product.repository');
vi.mock('../../user/repositories/user.repository');

describe('Stream Chat History', () => {
  let streamService: StreamService;
  let mockStreamRepository: any;
  let mockProductRepository: any;
  let mockUserRepository: any;

  const mockStreamId = '123e4567-e89b-12d3-a456-426614174000';
  const mockStream = {
    id: mockStreamId,
    title: 'Test Stream',
    userId: 'user-123',
    isLive: true,
  };

  const mockChatHistory = {
    messages: [
      {
        id: '223e4567-e89b-12d3-a456-426614174000',
        content: 'Hello chat!',
        userId: 'user-123',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'streamer',
        timestamp: new Date('2025-01-20T10:00:00Z'),
        type: 'message',
        isPinned: false,
        isDeleted: false,
        replyTo: null,
        reactions: [],
        reactionCount: 0,
      },
      {
        id: '323e4567-e89b-12d3-a456-426614174000',
        content: 'Welcome everyone!',
        userId: 'user-456',
        username: 'viewer1',
        avatarUrl: null,
        role: 'viewer',
        timestamp: new Date('2025-01-20T10:01:00Z'),
        type: 'message',
        isPinned: false,
        isDeleted: false,
        replyTo: null,
        reactions: [
          { emoji: '👍', userId: 'user-789' },
          { emoji: '❤️', userId: 'user-101' },
        ],
        reactionCount: 2,
      },
    ],
    hasMore: false,
    nextCursor: null,
  };

  beforeEach(() => {
    mockStreamRepository = {
      findStreamById: vi.fn(),
      getStreamComments: vi.fn(),
      getStreamChatHistory: vi.fn(),
    };
    mockProductRepository = {};
    mockUserRepository = {};

    streamService = new StreamService(
      mockStreamRepository as any,
      mockProductRepository as any,
      mockUserRepository as any,
    );
  });

  describe('getStreamComments', () => {
    it('should return stream not found if stream does not exist', async () => {
      mockStreamRepository.findStreamById.mockResolvedValue(null);

      const result = await streamService.getStreamComments(mockStreamId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Stream not found');
    });

    it('should use basic method when no options provided', async () => {
      const mockComments = [
        { id: '1', content: 'Comment 1', user: { id: 'u1', username: 'user1' } },
        { id: '2', content: 'Comment 2', user: { id: 'u2', username: 'user2' } },
      ];

      mockStreamRepository.findStreamById.mockResolvedValue(mockStream);
      mockStreamRepository.getStreamComments.mockResolvedValue(mockComments);

      const result = await streamService.getStreamComments(mockStreamId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comments retrieved successfully');
      expect(result.data).toEqual(mockComments);
      expect(mockStreamRepository.getStreamComments).toHaveBeenCalledWith(mockStreamId);
      expect(mockStreamRepository.getStreamChatHistory).not.toHaveBeenCalled();
    });

    it('should use chat history method when options provided', async () => {
      mockStreamRepository.findStreamById.mockResolvedValue(mockStream);
      mockStreamRepository.getStreamChatHistory.mockResolvedValue(mockChatHistory);

      const options = {
        limit: 20,
        orderBy: 'asc' as const,
        includeDeleted: false,
      };

      const result = await streamService.getStreamComments(mockStreamId, options);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Chat history retrieved successfully');
      expect(result.data).toEqual(mockChatHistory);
      expect(mockStreamRepository.getStreamChatHistory).toHaveBeenCalledWith(mockStreamId, options);
      expect(mockStreamRepository.getStreamComments).not.toHaveBeenCalled();
    });

    it('should handle cursor-based pagination', async () => {
      mockStreamRepository.findStreamById.mockResolvedValue(mockStream);
      mockStreamRepository.getStreamChatHistory.mockResolvedValue({
        ...mockChatHistory,
        hasMore: true,
        nextCursor: '423e4567-e89b-12d3-a456-426614174000',
      });

      const options = {
        cursor: '123e4567-e89b-12d3-a456-426614174000',
        limit: 10,
      };

      const result = await streamService.getStreamComments(mockStreamId, options);

      expect(result.success).toBe(true);
      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBe('423e4567-e89b-12d3-a456-426614174000');
    });

    it('should handle date range filtering', async () => {
      mockStreamRepository.findStreamById.mockResolvedValue(mockStream);
      mockStreamRepository.getStreamChatHistory.mockResolvedValue(mockChatHistory);

      const options = {
        after: '2025-01-20T09:00:00Z',
        before: '2025-01-20T11:00:00Z',
      };

      const result = await streamService.getStreamComments(mockStreamId, options);

      expect(result.success).toBe(true);
      expect(mockStreamRepository.getStreamChatHistory).toHaveBeenCalledWith(mockStreamId, options);
    });

    it('should handle includeDeleted option', async () => {
      const chatHistoryWithDeleted = {
        ...mockChatHistory,
        messages: [
          ...mockChatHistory.messages,
          {
            id: '523e4567-e89b-12d3-a456-426614174000',
            content: '[Message deleted]',
            userId: 'user-999',
            username: 'deleteduser',
            avatarUrl: null,
            role: 'viewer',
            timestamp: new Date('2025-01-20T10:02:00Z'),
            type: 'message',
            isPinned: false,
            isDeleted: true,
            replyTo: null,
            reactions: [],
            reactionCount: 0,
          },
        ],
      };

      mockStreamRepository.findStreamById.mockResolvedValue(mockStream);
      mockStreamRepository.getStreamChatHistory.mockResolvedValue(chatHistoryWithDeleted);

      const options = {
        includeDeleted: true,
      };

      const result = await streamService.getStreamComments(mockStreamId, options);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(3);
      expect(result.data.messages[2].isDeleted).toBe(true);
    });
  });
});
