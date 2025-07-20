import { instrument } from '@socket.io/admin-ui';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketServer, Socket } from 'socket.io';

import { env } from './env-config';
import { PrismaService } from './prisma.config';
import { initializeSocketServer } from '../socket';

export interface SocketUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  role?: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
  userId?: string;
  username?: string;
  role?: string;
}

export class SocketService {
  private static instance: SocketService;
  private io: SocketServer | null = null;
  private prisma: PrismaService;

  private constructor() {
    this.prisma = PrismaService.getInstance();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(httpServer: HttpServer): SocketServer {
    if (this.io) {
      return this.io;
    }

    // Initialize our comprehensive Socket.IO server
    initializeSocketServer(httpServer);
    
    // Get the initialized IO instance
    const { SocketServer } = require('./socket/socket.config');
    const socketServerInstance = SocketServer.getInstance();
    this.io = socketServerInstance.getIO();

    return this.io;
  }

  public getIO(): SocketServer | null {
    return this.io;
  }

  public async close(): Promise<void> {
    if (this.io) {
      await new Promise<void>(resolve => {
        this.io!.close(() => {
          console.log('Socket.io server closed');
          resolve();
        });
      });
      this.io = null;
    }
  }

  // Utility method to emit to specific user
  public emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Utility method to emit to all users
  public emitToAll(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Utility method to emit to a specific room
  public emitToRoom(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }
}