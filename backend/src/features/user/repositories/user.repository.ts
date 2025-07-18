import { PrismaClient } from '@prisma/client';

export class UserRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        isAdmin: true,
        streamKey: true,
        role: { select: { name: true } },
      },
    });
  }

  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        isAdmin: true,
        streamKey: true,
      },
    });
  }

  async createUser(data: { email: string; username: string; password: string; firstName: string }) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        streamKey: true,
        role: { select: { name: true } },
      },
    });
  }

  async findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
      },
    });
  }

  async findUserByStreamKey(streamKey: string) {
    return this.prisma.user.findUnique({
      where: { streamKey },
      select: {
        id: true,
        username: true,
        streamKey: true,
      },
    });
  }
}
