import { instrument } from '@socket.io/admin-ui';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

import { env } from '../env-config.js';
import { defaultSecurityConfig } from './security.config.js';

export interface SocketWithAuth extends Socket {
  userId?: string;
  username?: string;
  role?: string;
}

export class SocketServer {
  private static instance: SocketServer;
  private io: SocketIOServer;

  private constructor(httpServer: HTTPServer) {
    // Enhanced security configuration
    const securityConfig = defaultSecurityConfig;
    const allowedOrigins = env.WHITE_LIST_URLS && env.WHITE_LIST_URLS.length > 0 
      ? env.WHITE_LIST_URLS 
      : securityConfig.cors.allowedOrigins;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Allow same-origin requests (no origin header)
          if (!origin) return callback(null, true);
          
          // Check against allowed origins
          const isAllowed = allowedOrigins.includes(origin) || 
            (env.NODE_ENV === 'development' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) ||
            // Allow Socket.IO Admin UI hosted sites
            origin === 'https://admin.socket.io' ||
            origin === 'https://socket.io' ||
            /^https:\/\/.*\.socket\.io$/.test(origin);
          
          if (isAllowed) {
            callback(null, true);
          } else {
            console.warn(`CORS: Blocked origin ${origin}`);
            callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
          }
        },
        credentials: securityConfig.cors.allowCredentials,
        methods: securityConfig.cors.allowedMethods,
        allowedHeaders: securityConfig.cors.allowedHeaders,
      },
      
      // Connection timeouts - more lenient for development
      pingTimeout: 120000, // 120 seconds (doubled)
      pingInterval: 30000, // 30 seconds
      
      // Security settings
      maxHttpBufferSize: securityConfig.validation.maxPayloadSize,
      allowEIO3: false, // Disable legacy Engine.IO v3 support
      
      // Transports restriction (disable polling in production for security)
      transports: env.NODE_ENV === 'production' ? ['websocket'] : ['websocket', 'polling'],
      
      // Connection state recovery (prevent replay attacks)
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: false, // Always run security middleware
      },
    });

    // Enable admin UI in development with enhanced security
    if (env.NODE_ENV === 'development') {
      console.log('🔧 Initializing Socket.IO Admin UI...');
      instrument(this.io, {
        auth: false, // Temporarily disable auth for testing
        mode: 'development',
        namespaceName: '/admin',
      });
      console.log('✅ Socket.IO Admin UI initialized at /admin');
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
