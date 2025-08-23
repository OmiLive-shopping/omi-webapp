import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import type { AddressInfo } from 'net';

/**
 * Mock WebSocket server for testing
 */
export class WebSocketTestServer {
  private httpServer: any;
  private io: SocketIOServer;
  private port: number;
  private isRunning = false;

  // Mock data stores
  private connectedClients = new Map<string, any>();
  private streamRooms = new Map<string, Set<string>>(); // streamId -> Set<socketId>
  private chatHistory = new Map<string, any[]>(); // streamId -> messages
  private streamAnalytics = new Map<string, any>(); // streamId -> analytics

  constructor(port = 0) {
    this.port = port;
    this.httpServer = createServer();
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  /**
   * Start the test server
   */
  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, (error: any) => {
        if (error) {
          reject(error);
          return;
        }

        const address = this.httpServer.address() as AddressInfo;
        this.port = address.port;
        this.isRunning = true;
        console.log(`WebSocket test server running on port ${this.port}`);
        resolve(this.port);
      });
    });
  }

  /**
   * Stop the test server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    return new Promise((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          this.isRunning = false;
          this.cleanup();
          console.log('WebSocket test server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Get server URL
   */
  public getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Get connection count
   */
  public getConnectionCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get connected clients
   */
  public getConnectedClients(): Map<string, any> {
    return new Map(this.connectedClients);
  }

  /**
   * Get stream room members
   */
  public getStreamMembers(streamId: string): Set<string> {
    return this.streamRooms.get(streamId) || new Set();
  }

  /**
   * Get chat history for a stream
   */
  public getChatHistory(streamId: string): any[] {
    return this.chatHistory.get(streamId) || [];
  }

  /**
   * Simulate server error
   */
  public simulateError(errorType: 'disconnect' | 'server_error' | 'rate_limit' = 'server_error'): void {
    switch (errorType) {
      case 'disconnect':
        this.io.emit('disconnect', 'transport close');
        break;
      case 'server_error':
        this.io.emit('error', { message: 'Internal server error', code: 500 });
        break;
      case 'rate_limit':
        this.io.emit('rate_limit_exceeded', {
          eventType: 'chat:send-message',
          reason: 'Too many messages',
          retryAfter: 5,
          resetTime: Date.now() + 5000
        });
        break;
    }
  }

  /**
   * Inject a message into chat history
   */
  public injectChatMessage(streamId: string, message: any): void {
    if (!this.chatHistory.has(streamId)) {
      this.chatHistory.set(streamId, []);
    }
    
    const fullMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...message
    };
    
    this.chatHistory.get(streamId)!.push(fullMessage);
    
    // Broadcast to room members
    this.io.to(`stream:${streamId}`).emit('chat:message', fullMessage);
  }

  /**
   * Update stream analytics
   */
  public updateStreamAnalytics(streamId: string, analytics: any): void {
    this.streamAnalytics.set(streamId, {
      ...this.streamAnalytics.get(streamId),
      ...analytics,
      timestamp: new Date().toISOString()
    });

    // Broadcast analytics update
    this.io.to(`stream:${streamId}`).emit('stream:analytics', {
      streamId,
      analytics: this.streamAnalytics.get(streamId)
    });
  }

  /**
   * Force disconnect a client
   */
  public disconnectClient(socketId: string, reason = 'forced disconnect'): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
    }
  }

  /**
   * Setup all event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Test client connected: ${socket.id}`);
      
      // Store client info
      this.connectedClients.set(socket.id, {
        id: socket.id,
        connectedAt: new Date(),
        authenticated: false,
        userId: null,
        username: null,
        role: 'viewer'
      });

      // Authentication simulation
      socket.on('authenticate', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.authenticated = true;
          client.userId = data.userId || `user_${socket.id}`;
          client.username = data.username || `User${socket.id.slice(-4)}`;
          client.role = data.role || 'viewer';
          
          socket.emit('authenticated', {
            success: true,
            userId: client.userId,
            username: client.username,
            role: client.role
          });
        }
      });

      // Stream events
      this.setupStreamEvents(socket);
      
      // Chat events
      this.setupChatEvents(socket);
      
      // VDO.Ninja events
      this.setupVdoEvents(socket);
      
      // Analytics events
      this.setupAnalyticsEvents(socket);

      // Connection health events
      this.setupHealthEvents(socket);

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`Test client disconnected: ${socket.id}, reason: ${reason}`);
        this.handleClientDisconnect(socket.id);
      });
    });
  }

  private setupStreamEvents(socket: any): void {
    // Join stream
    socket.on('stream:join', (data: { streamId: string }) => {
      const { streamId } = data;
      socket.join(`stream:${streamId}`);
      
      // Add to room tracking
      if (!this.streamRooms.has(streamId)) {
        this.streamRooms.set(streamId, new Set());
      }
      this.streamRooms.get(streamId)!.add(socket.id);
      
      const viewerCount = this.streamRooms.get(streamId)!.size;
      
      socket.emit('stream:joined', {
        streamId,
        success: true,
        viewerCount
      });

      // Notify others
      socket.to(`stream:${streamId}`).emit('stream:viewer:joined', {
        viewerCount,
        viewer: this.connectedClients.get(socket.id)
      });
    });

    // Leave stream
    socket.on('stream:leave', (data: { streamId: string }) => {
      const { streamId } = data;
      socket.leave(`stream:${streamId}`);
      
      // Remove from room tracking
      const room = this.streamRooms.get(streamId);
      if (room) {
        room.delete(socket.id);
        const viewerCount = room.size;
        
        socket.emit('stream:left', {
          streamId,
          success: true,
          viewerCount
        });

        // Notify others
        socket.to(`stream:${streamId}`).emit('stream:viewer:left', {
          viewerCount,
          viewer: this.connectedClients.get(socket.id)
        });
      }
    });

    // Stream lifecycle events
    socket.on('stream:start', (data: any) => {
      const streamId = data.streamId;
      socket.to(`stream:${streamId}`).emit('stream:started', {
        streamId,
        title: data.title,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('stream:end', (data: any) => {
      const streamId = data.streamId;
      socket.to(`stream:${streamId}`).emit('stream:ended', {
        streamId,
        endedAt: new Date().toISOString(),
        message: data.message || 'Stream ended'
      });
    });
  }

  private setupChatEvents(socket: any): void {
    // Send message
    socket.on('chat:send-message', (data: {
      streamId: string;
      content: string;
      replyTo?: string;
    }) => {
      const client = this.connectedClients.get(socket.id);
      if (!client || !client.authenticated) {
        socket.emit('chat:error', { message: 'Authentication required' });
        return;
      }

      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamId: data.streamId,
        content: data.content,
        userId: client.userId,
        username: client.username,
        role: client.role,
        timestamp: new Date().toISOString(),
        replyTo: data.replyTo
      };

      // Store message
      if (!this.chatHistory.has(data.streamId)) {
        this.chatHistory.set(data.streamId, []);
      }
      this.chatHistory.get(data.streamId)!.push(message);

      // Broadcast to room
      this.io.to(`stream:${data.streamId}`).emit('chat:message', message);
      
      // Confirm to sender
      socket.emit('chat:message:sent', { messageId: message.id, success: true });
    });

    // Get chat history
    socket.on('chat:get-history', (data: { streamId: string; limit?: number }) => {
      const history = this.chatHistory.get(data.streamId) || [];
      const limit = data.limit || 50;
      
      socket.emit('chat:history', {
        streamId: data.streamId,
        messages: history.slice(-limit)
      });
    });

    // Typing indicators
    socket.on('chat:typing', (data: { streamId: string; isTyping: boolean }) => {
      const client = this.connectedClients.get(socket.id);
      if (client) {
        socket.to(`stream:${data.streamId}`).emit('chat:user:typing', {
          userId: client.userId,
          username: client.username,
          isTyping: data.isTyping
        });
      }
    });
  }

  private setupVdoEvents(socket: any): void {
    // VDO.Ninja stream events
    socket.on('vdo:stream:event', (data: any) => {
      socket.emit('vdo:stream:response', { success: true, data });
    });

    // VDO.Ninja stats
    socket.on('vdo:stats:update', (data: any) => {
      const { streamId } = data;
      
      // Update analytics
      this.updateStreamAnalytics(streamId, {
        fps: data.fps,
        bitrate: data.bitrate,
        resolution: data.resolution,
        viewers: this.getStreamMembers(streamId).size
      });
    });

    // VDO.Ninja quality events
    socket.on('vdo:quality:event', (data: any) => {
      socket.to(`stream:${data.streamId}`).emit('vdo:quality:changed', data);
    });
  }

  private setupAnalyticsEvents(socket: any): void {
    // Analytics subscription
    socket.on('analytics:subscribe', (data: { streamId: string }) => {
      socket.join(`analytics:${data.streamId}`);
      
      // Send current analytics
      const analytics = this.streamAnalytics.get(data.streamId);
      if (analytics) {
        socket.emit('analytics:initial', {
          streamId: data.streamId,
          metrics: analytics
        });
      }
      
      socket.emit('analytics:subscribed', { streamId: data.streamId, success: true });
    });

    socket.on('analytics:unsubscribe', (streamId: string) => {
      socket.leave(`analytics:${streamId}`);
      socket.emit('analytics:unsubscribed', { streamId });
    });
  }

  private setupHealthEvents(socket: any): void {
    // Ping/pong for connection health
    socket.on('ping', (timestamp: number) => {
      socket.emit('pong', timestamp);
    });

    socket.on('connection:ping', (timestamp: number) => {
      socket.emit('connection:health', {
        latency: Date.now() - timestamp,
        quality: 'good',
        timestamp: Date.now()
      });
    });
  }

  private handleClientDisconnect(socketId: string): void {
    // Remove from all rooms
    for (const [streamId, members] of this.streamRooms.entries()) {
      if (members.has(socketId)) {
        members.delete(socketId);
        
        // Notify remaining members
        this.io.to(`stream:${streamId}`).emit('stream:viewer:left', {
          viewerCount: members.size,
          viewer: this.connectedClients.get(socketId)
        });
      }
    }

    // Remove client
    this.connectedClients.delete(socketId);
  }

  private cleanup(): void {
    this.connectedClients.clear();
    this.streamRooms.clear();
    this.chatHistory.clear();
    this.streamAnalytics.clear();
  }

  /**
   * Test utilities
   */

  public waitForConnection(): Promise<string> {
    return new Promise((resolve) => {
      this.io.once('connection', (socket) => {
        resolve(socket.id);
      });
    });
  }

  public waitForEvent(event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      this.io.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  public emitToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  public hasClient(socketId: string): boolean {
    return this.connectedClients.has(socketId);
  }
}
