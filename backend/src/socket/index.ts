import { Server as HTTPServer } from 'http';
import { container } from 'tsyringe';

import { SocketServer, SocketWithAuth } from '../config/socket/socket.config.js';
import { ChatHandler } from './handlers/chat.handler.js';
import { StreamHandler } from './handlers/stream.handler.js';
import { vdoAnalyticsHandler } from './handlers/vdo-analytics.handler.js';
import { RoomManager } from './managers/room.manager.js';
import { socketAuthMiddleware } from './middleware/auth.middleware.js';
import { StreamSocketIntegration } from '../features/stream/events/socket-integration.js';
import RealtimeAnalyticsService from '../features/analytics/services/realtime-analytics.service.js';
import { SecurityManager, createSecurityMiddleware, createEventValidationWrapper } from './managers/security.manager.js';

export async function initializeSocketServer(httpServer: HTTPServer): Promise<void> {
  const socketServer = SocketServer.getInstance(httpServer);
  const io = socketServer.getIO();
  const roomManager = RoomManager.getInstance();

  // Initialize security manager
  const securityManager = SecurityManager.getInstance();
  const securityMiddleware = createSecurityMiddleware(securityManager);
  const validateEvent = createEventValidationWrapper(securityManager);

  // Initialize stream event socket integration with the HTTP server
  const streamSocketIntegration = StreamSocketIntegration.getInstance();
  streamSocketIntegration.initialize();
  
  // Initialize analytics socket integration
  const { analyticsSocketIntegration } = await import('../features/analytics/events/analytics-socket-integration.js');
  analyticsSocketIntegration.initialize();

  // Initialize chat-stream integration
  const { ChatStreamIntegrationService } = await import('./services/chat-stream-integration.service.js');
  const chatIntegration = ChatStreamIntegrationService.getInstance();
  await chatIntegration.initialize();

  // Initialize handlers
  const chatHandler = new ChatHandler();
  const streamHandler = new StreamHandler();

  // Apply security middleware first
  io.use(securityMiddleware);
  
  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Main namespace - handles general connections
  io.on('connection', (socket: SocketWithAuth) => {
    console.log(`User connected: ${socket.id} (${socket.username || 'anonymous'})`);

    // Join user-specific room if authenticated
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Stream events with enhanced security validation
    socket.on('stream:join', validateEvent('stream:join', data => streamHandler.handleJoinStreamEnhanced(socket, data)));
    socket.on('stream:leave', validateEvent('stream:leave', data => streamHandler.handleLeaveStreamEnhanced(socket, data)));
    socket.on('stream:update', validateEvent('stream:update', data => streamHandler.handleStreamUpdate(socket, data)));
    socket.on('stream:feature-product', validateEvent('stream:feature-product', data => streamHandler.handleFeatureProduct(socket, data)));
    socket.on('stream:get-analytics', validateEvent('stream:get-analytics', data => streamHandler.handleGetAnalytics(socket, data)));
    socket.on('stream:stats:update', validateEvent('stream:stats:update', data => streamHandler.handleStreamStats(socket, data)));
    socket.on('stream:stats:get', validateEvent('stream:stats:get', data => streamHandler.handleGetStreamStatsEnhanced(socket, data)));

    // Register VDO.Ninja event handlers
    streamHandler.registerVdoHandlers(socket);

    // Register VDO.Ninja analytics handlers
    vdoAnalyticsHandler.registerHandlers(socket);

    // Chat events with enhanced security validation
    socket.on('chat:send-message', validateEvent('chat:send-message', data => chatHandler.handleSendMessageEnhanced(socket, data)));
    socket.on('chat:delete-message', validateEvent('chat:delete-message', data => chatHandler.handleDeleteMessageEnhanced(socket, data)));
    socket.on('chat:moderate-user', validateEvent('chat:moderate-user', data => chatHandler.handleModerateUserEnhanced(socket, data)));
    socket.on('chat:typing', validateEvent('chat:typing', data => chatHandler.handleTypingEnhanced(socket, data)));
    socket.on('chat:get-history', validateEvent('chat:get-history', data => chatHandler.handleGetHistory(socket, data)));
    socket.on('chat:react', validateEvent('chat:react', data => chatHandler.handleReactToMessageEnhanced(socket, data)));
    socket.on('chat:pin-message', validateEvent('chat:pin-message', data => chatHandler.handlePinMessage(socket, data)));
    socket.on('chat:slowmode', validateEvent('chat:slowmode', data => chatHandler.handleSlowMode(socket, data)));

    // Rate limit management events
    socket.on('rate_limit:get_status', data => chatHandler.getRateLimitStatus(socket, data.eventType));
    socket.on('admin:rate_limit:reset', data => chatHandler.resetUserRateLimits(socket, data));
    socket.on('admin:rate_limit:stats', () => chatHandler.getRateLimitStats(socket));

    // Connection health monitoring
    socket.on('ping', (timestamp: number) => {
      socket.emit('pong', timestamp);
    });

    socket.on('connection:ping', (timestamp: number) => {
      socket.emit('connection:pong', {
        timestamp,
        serverTime: Date.now(),
        connectedClients: io.engine.clientsCount,
      });
    });

    // TEST EVENTS - For debugging WebSocket connectivity
    socket.on('test:echo', (data) => {
      console.log(`Test echo from ${socket.id}:`, data);
      // Echo back to sender
      socket.emit('test:echo:reply', { 
        ...data, 
        timestamp: new Date().toISOString(),
        socketId: socket.id 
      });
    });

    socket.on('test:broadcast', (data) => {
      console.log(`Test broadcast from ${socket.id} to room ${data.room}:`, data);
      if (data.room) {
        // Broadcast to everyone in the room (including sender)
        io.to(`test:${data.room}`).emit('test:broadcast:message', {
          ...data,
          from: socket.id,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('test:join-room', (data) => {
      const roomId = data.room || data.roomId;
      console.log(`${socket.id} joining test room: test:${roomId}`);
      socket.join(`test:${roomId}`);
      socket.emit('test:joined', { room: roomId });
      // Notify others in room
      socket.to(`test:${roomId}`).emit('test:user-joined', { 
        userId: socket.id,
        room: roomId 
      });
    });

    socket.on('test:leave-room', (data) => {
      const roomId = data.room || data.roomId;
      console.log(`${socket.id} leaving test room: test:${roomId}`);
      socket.leave(`test:${roomId}`);
      socket.emit('test:left', { room: roomId });
      // Notify others in room
      socket.to(`test:${roomId}`).emit('test:user-left', { 
        userId: socket.id,
        room: roomId 
      });
    });

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

    // Only streamers and admins can connect to analytics
    if (socket.role !== 'streamer' && socket.role !== 'admin') {
      socket.emit('error', { message: 'Unauthorized' });
      socket.disconnect();
      return;
    }

    // Handle real-time analytics subscription
    socket.on('analytics:subscribe', async (data: {
      streamId: string;
      filters?: {
        eventTypes?: string[];
        minPriority?: 'low' | 'medium' | 'high' | 'critical';
        updateInterval?: number;
      };
    }) => {
      try {
        const realtimeAnalytics = container.resolve(RealtimeAnalyticsService);
        
        const subscribed = await realtimeAnalytics.subscribe(
          data.streamId,
          socket.userId!,
          socket.id,
          socket.role as 'streamer' | 'admin',
          data.filters
        );

        if (subscribed) {
          socket.join(`analytics:${data.streamId}`);
          
          // Send current analytics data
          const currentAnalytics = await realtimeAnalytics.getCurrentAnalytics(data.streamId);
          socket.emit('analytics:initial', {
            streamId: data.streamId,
            metrics: currentAnalytics,
            timestamp: new Date().toISOString(),
          });

          socket.emit('analytics:subscribed', {
            streamId: data.streamId,
            success: true,
          });
        } else {
          socket.emit('analytics:error', {
            message: 'Failed to subscribe to analytics',
          });
        }
      } catch (error) {
        console.error('Analytics subscription error:', error);
        socket.emit('analytics:error', {
          message: 'Internal error during subscription',
        });
      }
    });

    socket.on('analytics:unsubscribe', (streamId: string) => {
      socket.leave(`analytics:${streamId}`);
      
      const realtimeAnalytics = container.resolve(RealtimeAnalyticsService);
      realtimeAnalytics.unsubscribe(socket.id);
      
      socket.emit('analytics:unsubscribed', { streamId });
    });

    // Configure milestones
    socket.on('analytics:configure:milestones', (data: {
      streamId: string;
      milestones: any;
    }) => {
      const realtimeAnalytics = container.resolve(RealtimeAnalyticsService);
      realtimeAnalytics.configureMilestones(data.streamId, data.milestones);
      
      socket.emit('analytics:milestones:configured', {
        streamId: data.streamId,
        success: true,
      });
    });

    // Configure alert thresholds
    socket.on('analytics:configure:alerts', (data: {
      streamId: string;
      thresholds: any;
    }) => {
      const realtimeAnalytics = container.resolve(RealtimeAnalyticsService);
      realtimeAnalytics.configureAlertThresholds(data.streamId, data.thresholds);
      
      socket.emit('analytics:alerts:configured', {
        streamId: data.streamId,
        success: true,
      });
    });

    // Update throttle configuration
    socket.on('analytics:configure:throttle', (config: any) => {
      if (socket.role === 'admin') {
        const realtimeAnalytics = container.resolve(RealtimeAnalyticsService);
        realtimeAnalytics.updateThrottleConfig(config);
        
        socket.emit('analytics:throttle:configured', {
          success: true,
        });
      } else {
        socket.emit('analytics:error', {
          message: 'Insufficient permissions',
        });
      }
    });

    // Get subscription statistics (admin only)
    socket.on('analytics:stats:subscriptions', () => {
      if (socket.role === 'admin') {
        const realtimeAnalytics = container.resolve(RealtimeAnalyticsService);
        const stats = realtimeAnalytics.getSubscriptionStats();
        
        socket.emit('analytics:stats:subscriptions:data', stats);
      } else {
        socket.emit('analytics:error', {
          message: 'Insufficient permissions',
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const realtimeAnalytics = container.resolve(RealtimeAnalyticsService);
      realtimeAnalytics.unsubscribe(socket.id);
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
