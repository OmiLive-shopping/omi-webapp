import { instrument } from '@socket.io/admin-ui';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

import { env } from '../env-config';

export interface SocketWithAuth extends Socket {
  userId?: string;
  username?: string;
  role?: string;
}

export class SocketServer {
  private static instance: SocketServer;
  private io: SocketIOServer;

  private constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.WHITE_LIST_URLS || ['http://localhost:5173', 'http://localhost:5174'],
        credentials: true,
      },
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
    });

    // Enable admin UI in development
    if (env.NODE_ENV === 'development') {
      instrument(this.io, {
        auth: false,
        mode: 'development',
      });
    }
  }

  static getInstance(httpServer?: HTTPServer): SocketServer {
    if (!SocketServer.instance) {
      if (!httpServer) {
        throw new Error('HTTP server is required for initial Socket.IO setup');
      }
      SocketServer.instance = new SocketServer(httpServer);
    }
    return SocketServer.instance;
  }

  getIO(): SocketIOServer {
    return this.io;
  }

  // Emit to specific room
  emitToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Get connected sockets in a room
  async getSocketsInRoom(room: string): Promise<string[]> {
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map(s => s.id);
  }

  // Get room member count
  async getRoomMemberCount(room: string): Promise<number> {
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.length;
  }

  // Disconnect all sockets in a room
  async disconnectRoom(room: string): Promise<void> {
    this.io.in(room).disconnectSockets(true);
  }
}
