import { Server as HTTPServer } from 'http';

import { SocketServer, SocketWithAuth } from '../config/socket/socket.config.js';
import { ChatHandler } from './handlers/chat.handler.js';
import { StreamHandler } from './handlers/stream.handler.js';
import { vdoAnalyticsHandler } from './handlers/vdo-analytics.handler.js';
import { RoomManager } from './managers/room.manager.js';
import { socketAuthMiddleware } from './middleware/auth.middleware.js';

export function initializeSocketServer(httpServer: HTTPServer): void {
  const socketServer = SocketServer.getInstance(httpServer);
  const io = socketServer.getIO();
  const roomManager = RoomManager.getInstance();

  // Initialize handlers
  const chatHandler = new ChatHandler();
  const streamHandler = new StreamHandler();

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Main namespace - handles general connections
  io.on('connection', (socket: SocketWithAuth) => {
    console.log(`User connected: ${socket.id} (${socket.username || 'anonymous'})`);

    // Join user-specific room if authenticated
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Stream events
    socket.on('stream:join', data => streamHandler.handleJoinStream(socket, data));
    socket.on('stream:leave', data => streamHandler.handleLeaveStream(socket, data));
    socket.on('stream:update', data => streamHandler.handleStreamUpdate(socket, data));
    socket.on('stream:feature-product', data => streamHandler.handleFeatureProduct(socket, data));
    socket.on('stream:get-analytics', data => streamHandler.handleGetAnalytics(socket, data));
    socket.on('stream:stats:update', data => streamHandler.handleStreamStats(socket, data));
    socket.on('stream:stats:get', data => streamHandler.handleGetStreamStats(socket, data));

    // Register VDO.Ninja event handlers
    streamHandler.registerVdoHandlers(socket);

    // Register VDO.Ninja analytics handlers
    vdoAnalyticsHandler.registerHandlers(socket);

    // Chat events
    socket.on('chat:send-message', data => chatHandler.handleSendMessage(socket, data));
    socket.on('chat:delete-message', data => chatHandler.handleDeleteMessage(socket, data));
    socket.on('chat:moderate-user', data => chatHandler.handleModerateUser(socket, data));
    socket.on('chat:typing', data => chatHandler.handleTyping(socket, data));
    socket.on('chat:get-history', data => chatHandler.handleGetHistory(socket, data));
    socket.on('chat:react', data => chatHandler.handleReactToMessage(socket, data));
    socket.on('chat:pin-message', data => chatHandler.handlePinMessage(socket, data));
    socket.on('chat:slowmode', data => chatHandler.handleSlowMode(socket, data));

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.id} (${socket.username || 'anonymous'})`);
      streamHandler.unregisterVdoHandlers(socket);
      await vdoAnalyticsHandler.unregisterHandlers(socket);
      await roomManager.handleDisconnect(socket);
    });

    // Error handling
    socket.on('error', error => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Create separate namespaces for specific features
  createChatNamespace(io);
  createNotificationNamespace(io);
  createAnalyticsNamespace(io);
}

// Chat namespace - dedicated to chat functionality
function createChatNamespace(io: any): void {
  const chatNamespace = io.of('/chat');

  chatNamespace.use(socketAuthMiddleware);

  chatNamespace.on('connection', (socket: SocketWithAuth) => {
    console.log(`Chat namespace connected: ${socket.id}`);

    // Chat-specific events can be handled here
    // This provides better separation of concerns
  });
}

// Notification namespace - for real-time notifications
function createNotificationNamespace(io: any): void {
  const notificationNamespace = io.of('/notifications');

  notificationNamespace.use(socketAuthMiddleware);

  notificationNamespace.on('connection', (socket: SocketWithAuth) => {
    if (!socket.userId) {
      socket.disconnect();
      return;
    }

    console.log(`Notification namespace connected: ${socket.userId}`);

    // Join user-specific notification room
    socket.join(`notifications:${socket.userId}`);

    // Handle notification acknowledgment
    socket.on('notification:ack', async (notificationId: string) => {
      // TODO: Mark notification as read in database
    });
  });
}

// Analytics namespace - for streamer analytics
function createAnalyticsNamespace(io: any): void {
  const analyticsNamespace = io.of('/analytics');

  analyticsNamespace.use(socketAuthMiddleware);

  analyticsNamespace.on('connection', (socket: SocketWithAuth) => {
    console.log(`Analytics namespace connected: ${socket.id}`);

    // Only streamers can connect to analytics
    if (socket.role !== 'streamer' && socket.role !== 'admin') {
      socket.emit('error', { message: 'Unauthorized' });
      socket.disconnect();
      return;
    }

    // Handle real-time analytics requests
    socket.on('analytics:subscribe', async (streamId: string) => {
      // TODO: Verify user owns the stream
      socket.join(`analytics:${streamId}`);

      // Send initial analytics data
      // Start sending periodic updates
    });

    socket.on('analytics:unsubscribe', (streamId: string) => {
      socket.leave(`analytics:${streamId}`);
    });
  });
}

// Export utility functions for emitting events from other parts of the app
export const socketEmitters = {
  // Emit to specific user
  emitToUser: (userId: string, event: string, data: any) => {
    const socketServer = SocketServer.getInstance();
    socketServer.emitToUser(userId, event, data);
  },

  // Emit to stream room
  emitToStream: (streamId: string, event: string, data: any) => {
    const socketServer = SocketServer.getInstance();
    socketServer.emitToRoom(`stream:${streamId}`, event, data);
  },

  // Emit notification
  emitNotification: (userId: string, notification: any) => {
    const socketServer = SocketServer.getInstance();
    const io = socketServer.getIO();
    io.of('/notifications').to(`notifications:${userId}`).emit('notification:new', notification);
  },

  // Emit analytics update
  emitAnalytics: (streamId: string, analytics: any) => {
    const socketServer = SocketServer.getInstance();
    const io = socketServer.getIO();
    io.of('/analytics').to(`analytics:${streamId}`).emit('analytics:update', analytics);
  },

  // Emit to all connected clients
  emitToAll: (event: string, data: any) => {
    const socketServer = SocketServer.getInstance();
    socketServer.getIO().emit(event, data);
  },
};
