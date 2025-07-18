import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductRepository } from '../../product/repositories/product.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { StreamRepository } from '../repositories/stream.repository';
import { StreamService } from '../services/stream.service';

vi.mock('../repositories/stream.repository');
vi.mock('../../product/repositories/product.repository');
vi.mock('../../user/repositories/user.repository');

describe('StreamService', () => {
  let streamService: StreamService;
  let mockStreamRepository: any;
  let mockProductRepository: any;
  let mockUserRepository: any;

  beforeEach(() => {
    mockStreamRepository = {
      createStream: vi.fn(),
      findStreamById: vi.fn(),
      findStreams: vi.fn(),
      updateStream: vi.fn(),
      deleteStream: vi.fn(),
      findStreamByUserStreamKey: vi.fn(),
      goLive: vi.fn(),
      endStream: vi.fn(),
      updateViewerCount: vi.fn(),
      incrementViewerCount: vi.fn(),
      decrementViewerCount: vi.fn(),
      addProductToStream: vi.fn(),
      removeProductFromStream: vi.fn(),
      getStreamProducts: vi.fn(),
      createComment: vi.fn(),
      getStreamComments: vi.fn(),
    };
    mockProductRepository = {
      findProductById: vi.fn(),
    };
    mockUserRepository = {
      findUserByStreamKey: vi.fn(),
    };
    streamService = new StreamService(
      mockStreamRepository,
      mockProductRepository,
      mockUserRepository,
    );
  });

  it('should create a stream', async () => {
    const mockStream = { id: '123', title: 'Test Stream' };
    mockStreamRepository.createStream.mockResolvedValue(mockStream);

    const result = await streamService.createStream('userId', {
      title: 'Test Stream',
      scheduled: '2025-12-31',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Stream created successfully');
    expect(result.data).toEqual(mockStream);
  });

  it('should get streams with filters', async () => {
    const mockStreams = [
      { id: '1', title: 'Stream 1', isLive: true },
      { id: '2', title: 'Stream 2', isLive: false },
    ];
    mockStreamRepository.findStreams.mockResolvedValue(mockStreams);

    const result = await streamService.getStreams({ isLive: true });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockStreams);
  });

  it('should go live with valid stream key', async () => {
    const mockStream = { id: '123', title: 'Test Stream', isLive: false };
    const mockLiveStream = { ...mockStream, isLive: true };

    mockStreamRepository.findStreamByUserStreamKey.mockResolvedValue(mockStream);
    mockStreamRepository.goLive.mockResolvedValue(mockLiveStream);

    const result = await streamService.goLive({ streamKey: 'test-key' });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Stream is now live');
    expect(result.data).toEqual(mockLiveStream);
  });

  it('should not go live if stream not found', async () => {
    mockStreamRepository.findStreamByUserStreamKey.mockResolvedValue(null);

    const result = await streamService.goLive({ streamKey: 'invalid-key' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('No scheduled stream found for this stream key');
  });

  it('should update stream if user owns it', async () => {
    const mockStream = { id: '123', title: 'Old Title', userId: 'user123', isLive: false };
    const updatedStream = { ...mockStream, title: 'New Title' };

    mockStreamRepository.findStreamById.mockResolvedValue(mockStream);
    mockStreamRepository.updateStream.mockResolvedValue(updatedStream);

    const result = await streamService.updateStream('123', 'user123', { title: 'New Title' });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Stream updated successfully');
  });

  it('should not update stream if user does not own it', async () => {
    const mockStream = { id: '123', title: 'Stream', userId: 'user123', isLive: false };

    mockStreamRepository.findStreamById.mockResolvedValue(mockStream);

    const result = await streamService.updateStream('123', 'differentUser', { title: 'New Title' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Unauthorized: You can only update your own streams');
  });

  it('should add comment to live stream', async () => {
    const mockStream = { id: '123', isLive: true };
    const mockComment = { id: 'c1', content: 'Great stream!', user: { username: 'user1' } };

    mockStreamRepository.findStreamById.mockResolvedValue(mockStream);
    mockStreamRepository.createComment.mockResolvedValue(mockComment);

    const result = await streamService.addComment('userId', '123', { content: 'Great stream!' });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Comment added successfully');
    expect(result.data).toEqual(mockComment);
  });

  it('should not add comment to offline stream', async () => {
    const mockStream = { id: '123', isLive: false };

    mockStreamRepository.findStreamById.mockResolvedValue(mockStream);

    const result = await streamService.addComment('userId', '123', { content: 'Great stream!' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Can only comment on live streams');
  });
});
