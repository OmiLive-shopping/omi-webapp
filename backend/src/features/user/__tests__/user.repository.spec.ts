import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRepository } from '../repositories/user.repository.js';

// ✅ Properly mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(), // ✅ Ensure these are properly mocked
      create: vi.fn(),
    },
  })),
}));

describe('UserRepository', () => {
  let prisma: PrismaClient;
  let userRepository: UserRepository;

  beforeEach(() => {
    prisma = new PrismaClient();
    userRepository = new UserRepository(prisma);
  });

  it('should find a user by email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '123',
      password: 'hashedpassword',
      isAdmin: false,
      streamKey: 'test-stream-key',
      role: { name: 'admin' }, // ✅ Matches the Prisma query
    } as any); // ✅ Type assertion to override TypeScript error

    const user = await userRepository.findUserByEmail('test@example.com');

    expect(user).toBeDefined();
    expect(user?.id).toBe('123');
    expect(user?.role?.name).toBe('admin');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: {
        id: true,
        password: true,
        isAdmin: true,
        streamKey: true,
        role: { select: { name: true } },
      },
    });
  });

  it('should return null if user not found by email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const user = await userRepository.findUserByEmail('notfound@example.com');

    expect(user).toBeNull();
  });

  it('should create a new user', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: '123',
      streamKey: 'generated-stream-key',
      role: { name: 'user' },
    } as any);

    const newUser = await userRepository.createUser({
      email: 'new@example.com',
      username: 'johndoe',
      password: 'hashedpassword',
      firstName: 'John',
    });

    expect(newUser).toBeDefined();
    expect(newUser?.id).toBe('123');
    expect(newUser?.role?.name).toBe('user');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        username: 'johndoe',
        password: 'hashedpassword',
        firstName: 'John',
      },
      select: { id: true, streamKey: true, role: { select: { name: true } } },
    });
  });

  it('should find a user by username', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '123',
      username: 'johndoe',
    } as any);

    const user = await userRepository.findUserByUsername('johndoe');

    expect(user).toBeDefined();
    expect(user?.id).toBe('123');
    expect(user?.username).toBe('johndoe');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'johndoe' },
      select: { id: true, username: true },
    });
  });

  it('should find a user by stream key', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '123',
      username: 'johndoe',
      streamKey: 'test-stream-key',
    } as any);

    const user = await userRepository.findUserByStreamKey('test-stream-key');

    expect(user).toBeDefined();
    expect(user?.id).toBe('123');
    expect(user?.streamKey).toBe('test-stream-key');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { streamKey: 'test-stream-key' },
      select: { id: true, username: true, streamKey: true },
    });
  });
});
