import { instrument } from '@socket.io/admin-ui';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';

import { env } from './env-config';
import { PrismaService } from './prisma.config';

export interface SocketUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface AuthenticatedSocket extends SocketServer {
  user?: SocketUser;
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

    // Initialize Socket.io with CORS configuration
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Set up admin UI in development
    if (env.NODE_ENV !== 'production') {
      instrument(this.io, {
        auth: {
          type: 'basic',
          username: env.SOCKET_ADMIN_USERNAME || 'admin',
          password: env.SOCKET_ADMIN_PASSWORD || 'admin',
        },
        mode: env.NODE_ENV === 'development' ? 'development' : 'production',
      });
    }

    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token =
          socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

        // Fetch user from database
        const user = await this.prisma.client.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            username: true,
            isAdmin: true,
          },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        // Attach user to socket
        socket.user = user;
        next();
      } catch (error) {
        return next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: any) => {
      console.log(`User ${socket.user.username} connected`);

      // Join user to their own room
      socket.join(`user:${socket.user.id}`);

      // Initialize stream handler
      const { StreamSocketHandler } = require('../socket-handlers/stream.handler');
      const streamHandler = new StreamSocketHandler();
      streamHandler.handleConnection(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.username} disconnected`);
      });

      // Error handler
      socket.on('error', (error: Error) => {
        console.error(`Socket error for user ${socket.user.username}:`, error);
      });
    });

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

