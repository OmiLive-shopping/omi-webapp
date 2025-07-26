import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StreamRepository } from '../repositories/stream.repository.js';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    stream: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    streamProduct: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  })),
}));

describe('StreamRepository', () => {
  let prisma: PrismaClient;
  let streamRepository: StreamRepository;

  beforeEach(() => {
    prisma = new PrismaClient();
    streamRepository = new StreamRepository(prisma);
  });

  it('should create a stream', async () => {
    const mockStream = {
      id: '123',
      title: 'Test Stream',
      description: 'Test description',
      scheduled: new Date('2025-12-31'),
      userId: 'user123',
      isLive: false,
      viewerCount: 0,
      user: { id: 'user123', username: 'testuser' },
    };

    vi.mocked(prisma.stream.create).mockResolvedValue(mockStream as any);

    const result = await streamRepository.createStream('user123', {
      title: 'Test Stream',
      description: 'Test description',
      scheduled: '2025-12-31',
    });

    expect(result).toEqual(mockStream);
    expect(prisma.stream.create).toHaveBeenCalledWith({
      data: {
        title: 'Test Stream',
        description: 'Test description',
        scheduled: new Date('2025-12-31'),
        userId: 'user123',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  });

  it('should find stream by id with relations', async () => {
    const mockStream = {
      id: '123',
      title: 'Test Stream',
      user: { id: 'user123', username: 'testuser' },
      products: [{ id: '1', product: { id: 'p1', name: 'Product 1' }, order: 0 }],
      _count: { comments: 10 },
    };

    vi.mocked(prisma.stream.findUnique).mockResolvedValue(mockStream as any);

    const result = await streamRepository.findStreamById('123');

    expect(result).toEqual(mockStream);
    expect(prisma.stream.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        products: {
          include: {
            product: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  });

  it('should go live', async () => {
    const mockStream = {
      id: '123',
      isLive: true,
      startedAt: new Date(),
    };

    vi.mocked(prisma.stream.update).mockResolvedValue(mockStream as any);

    const result = await streamRepository.goLive('123');

    expect(result).toEqual(mockStream);
    expect(prisma.stream.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        isLive: true,
        startedAt: expect.any(Date),
      },
    });
  });

  it('should find stream by user stream key', async () => {
    const mockUser = { id: 'user123' };
    const mockStream = {
      id: '123',
      title: 'Test Stream',
      user: { id: 'user123', username: 'testuser' },
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.stream.findFirst).mockResolvedValue(mockStream as any);

    const result = await streamRepository.findStreamByUserStreamKey('test-stream-key');

    expect(result).toEqual(mockStream);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { streamKey: 'test-stream-key' },
      select: { id: true },
    });
  });

  it('should create a comment', async () => {
    const mockComment = {
      id: '123',
      content: 'Great stream!',
      userId: 'user123',
      streamId: 'stream123',
      createdAt: new Date(),
      user: { id: 'user123', username: 'testuser' },
    };

    vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any);

    const result = await streamRepository.createComment('user123', 'stream123', {
      content: 'Great stream!',
    });

    expect(result).toEqual(mockComment);
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: 'Great stream!',
        userId: 'user123',
        streamId: 'stream123',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  });
});
