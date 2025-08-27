import { PrismaService } from '../../config/prisma.config.js';
import { SocketServer } from '../../config/socket/socket.config.js';
import { SystemMessageGenerator, SystemMessageData } from '../utils/system-messages.js';
import type { 
  StreamStartedEvent, 
  StreamEndedEvent, 
  StreamViewerJoinedEvent, 
  StreamViewerLeftEvent,
  StreamStatsUpdatedEvent 
} from '../../features/stream/events/stream-event-emitter.js';

/**
 * Service that integrates chat system with stream events
 * Automatically sends system messages to chat when stream events occur
 */
export class ChatStreamIntegrationService {
  private static instance: ChatStreamIntegrationService;
  private prisma = PrismaService.getInstance().client;
  private socketServer: SocketServer;
  private isInitialized = false;

  private constructor() {
    this.socketServer = SocketServer.getInstance();
  }

  static getInstance(): ChatStreamIntegrationService {
    if (!ChatStreamIntegrationService.instance) {
      ChatStreamIntegrationService.instance = new ChatStreamIntegrationService();
    }
    return ChatStreamIntegrationService.instance;
  }

  /**
   * Initialize the integration service and set up event listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Subscribe to stream events from the stream event emitter
    const { streamEventEmitter } = await import('../../features/stream/events/stream-event-emitter.js');
    
    // Stream lifecycle events
    streamEventEmitter.on('stream:started', this.handleStreamStarted.bind(this));
    streamEventEmitter.on('stream:ended', this.handleStreamEnded.bind(this));
    streamEventEmitter.on('stream:viewer:joined', this.handleViewerJoined.bind(this));
    streamEventEmitter.on('stream:viewer:left', this.handleViewerLeft.bind(this));
    streamEventEmitter.on('stream:stats:updated', this.handleStatsUpdated.bind(this));
    
    // Product events
    streamEventEmitter.on('stream:product:featured', this.handleProductFeatured.bind(this));
    streamEventEmitter.on('stream:product:added', this.handleProductAdded.bind(this));
    
    // Quality events
    streamEventEmitter.on('stream:quality:changed', this.handleQualityChanged.bind(this));
    
    this.isInitialized = true;
    console.log('Chat-Stream integration service initialized');
  }

  /**
   * Send a system message to chat
   */
  private async sendSystemMessage(
    streamId: string, 
    messageData: SystemMessageData,
    options: {
      saveToDatabase?: boolean;
      announceToRoom?: boolean;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<void> {
    const {
      saveToDatabase = false, // System messages are just real-time announcements
      announceToRoom = true,
      priority = 'medium'
    } = options;

    try {
      // Create message object
      const chatMessage = {
        id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'system',
        username: 'System',
        content: messageData.content,
        timestamp: new Date(),
        type: 'system' as const,
        subType: this.mapSystemTypeToSubType(messageData.type),
        isPinned: false,
        isDeleted: false,
        role: 'system',
        metadata: {
          systemType: messageData.type,
          priority,
          ...messageData.metadata
        }
      };

      // Save to database if requested
      if (saveToDatabase) {
        await this.saveChatMessage(streamId, chatMessage);
      }

      // Announce to room if requested
      if (announceToRoom) {
        this.socketServer.emitToRoom(
          `stream:${streamId}`, 
          'chat:system-message', 
          chatMessage
        );
        
        // Also emit to general chat:message event for compatibility
        this.socketServer.emitToRoom(
          `stream:${streamId}`, 
          'chat:message', 
          chatMessage
        );
      }

      console.log(`System message sent for stream ${streamId}: ${messageData.content}`);
    } catch (error) {
      console.error('Error sending system message:', error);
    }
  }

  /**
   * Handle stream started event
   */
  private async handleStreamStarted(event: StreamStartedEvent): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('stream:started', {
      streamId: event.streamId,
      username: event.user?.username
    });

    await this.sendSystemMessage(event.streamId, messageData, {
      priority: 'high',
      announceToRoom: true
    });
  }

  /**
   * Handle stream ended event
   */
  private async handleStreamEnded(event: StreamEndedEvent): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('stream:ended', {
      streamId: event.streamId,
      username: event.user?.username,
      duration: event.metadata?.duration
    });

    await this.sendSystemMessage(event.streamId, messageData, {
      priority: 'high',
      announceToRoom: true
    });
  }

  /**
   * Handle viewer joined event
   */
  private async handleViewerJoined(event: StreamViewerJoinedEvent): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('stream:viewer:joined', {
      streamId: event.streamId,
      username: event.viewer?.username,
      userId: event.viewer?.id,
      viewerCount: event.viewerCount
    });

    // Only announce viewer joins for named users (not anonymous)
    const shouldAnnounce = event.viewer?.username && event.viewer.username !== 'anonymous';
    
    await this.sendSystemMessage(event.streamId, messageData, {
      priority: 'low',
      announceToRoom: shouldAnnounce,
      saveToDatabase: false // Don't clutter database with every viewer join
    });
  }

  /**
   * Handle viewer left event
   */
  private async handleViewerLeft(event: StreamViewerLeftEvent): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('stream:viewer:left', {
      streamId: event.streamId,
      username: event.viewer?.username,
      userId: event.viewer?.id,
      viewerCount: event.viewerCount
    });

    // Only announce viewer leaves for named users (not anonymous)
    const shouldAnnounce = event.viewer?.username && event.viewer.username !== 'anonymous';
    
    await this.sendSystemMessage(event.streamId, messageData, {
      priority: 'low',
      announceToRoom: shouldAnnounce,
      saveToDatabase: false // Don't clutter database with every viewer leave
    });
  }

  /**
   * Handle stats updated event (periodic viewer count updates)
   */
  private async handleStatsUpdated(event: StreamStatsUpdatedEvent): Promise<void> {
    // Only send chat message for significant viewer count milestones
    const viewerCount = event.stats.viewerCount || 0;
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    
    if (milestones.includes(viewerCount)) {
      const messageData = SystemMessageGenerator.generateMessage('stream:viewer:joined', {
        streamId: event.streamId,
        viewerCount: viewerCount,
        milestone: true
      });

      // Override the content for milestone messages
      messageData.content = `🎉 ${viewerCount} viewers watching! Thanks for joining!`;

      await this.sendSystemMessage(event.streamId, messageData, {
        priority: 'medium',
        announceToRoom: true
      });
    }
  }

  /**
   * Handle product featured event
   */
  private async handleProductFeatured(event: any): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('stream:product:featured', {
      streamId: event.streamId,
      productId: event.product?.id,
      productName: event.product?.name || event.product?.title
    });

    await this.sendSystemMessage(event.streamId, messageData, {
      priority: 'medium',
      announceToRoom: true
    });
  }

  /**
   * Handle product added event
   */
  private async handleProductAdded(event: any): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('stream:product:added', {
      streamId: event.streamId,
      productId: event.product?.id,
      productName: event.product?.name || event.product?.title
    });

    await this.sendSystemMessage(event.streamId, messageData, {
      priority: 'low',
      announceToRoom: true
    });
  }

  /**
   * Handle quality changed event
   */
  private async handleQualityChanged(event: any): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('stream:quality:changed', {
      streamId: event.streamId,
      quality: event.quality,
      username: event.user?.username
    });

    await this.sendSystemMessage(event.streamId, messageData, {
      priority: 'low',
      announceToRoom: true,
      saveToDatabase: false // Don't save quality changes to database
    });
  }

  /**
   * Send moderation system message
   */
  async sendModerationMessage(
    streamId: string,
    action: string,
    targetUsername: string,
    moderatorUsername: string,
    options: {
      reason?: string;
      duration?: number;
    } = {}
  ): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('chat:moderation', {
      streamId,
      action,
      targetUsername,
      moderatorUsername,
      ...options
    });

    await this.sendSystemMessage(streamId, messageData, {
      priority: 'high',
      announceToRoom: true
    });
  }

  /**
   * Send slow mode message
   */
  async sendSlowModeMessage(
    streamId: string,
    enabled: boolean,
    delay: number,
    moderatorUsername: string
  ): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('chat:slowmode', {
      streamId,
      enabled,
      delay,
      moderatorUsername
    });

    await this.sendSystemMessage(streamId, messageData, {
      priority: 'medium',
      announceToRoom: true
    });
  }

  /**
   * Send VDO connection status message
   */
  async sendVdoConnectionMessage(
    streamId: string,
    status: 'connected' | 'disconnected' | 'reconnecting',
    username?: string
  ): Promise<void> {
    const messageData = SystemMessageGenerator.generateMessage('vdo:connection', {
      streamId,
      status,
      username
    });

    await this.sendSystemMessage(streamId, messageData, {
      priority: 'medium',
      announceToRoom: true,
      saveToDatabase: false
    });
  }

  /**
   * Send custom system message
   */
  async sendCustomSystemMessage(
    streamId: string,
    content: string,
    options: {
      priority?: 'low' | 'medium' | 'high';
      saveToDatabase?: boolean;
      metadata?: any;
    } = {}
  ): Promise<void> {
    const messageData = SystemMessageGenerator.generateCustomMessage(
      streamId,
      content,
      'stream:started', // Default type
      options.metadata
    );

    await this.sendSystemMessage(streamId, messageData, {
      priority: options.priority || 'medium',
      saveToDatabase: options.saveToDatabase !== false
    });
  }

  /**
   * Save chat message to database
   */
  private async saveChatMessage(streamId: string, message: any): Promise<void> {
    try {
      await this.prisma.streamMessage.create({
        data: {
          id: message.id,
          streamId,
          userId: message.userId,
          username: message.username,
          content: message.content,
          type: message.type,
          subType: message.subType,
          metadata: message.metadata || {},
          isPinned: message.isPinned || false,
          isDeleted: message.isDeleted || false,
          createdAt: message.timestamp
        }
      });
    } catch (error) {
      console.error('Error saving chat message to database:', error);
    }
  }

  /**
   * Map system message type to chat subtype
   */
  private mapSystemTypeToSubType(systemType: string): string {
    const mapping: Record<string, string> = {
      'stream:started': 'stream',
      'stream:ended': 'stream',
      'stream:viewer:joined': 'viewer',
      'stream:viewer:left': 'viewer',
      'stream:quality:changed': 'quality',
      'stream:recording:started': 'stream',
      'stream:recording:stopped': 'stream',
      'stream:product:featured': 'stream',
      'stream:product:added': 'stream',
      'stream:error': 'error',
      'chat:moderation': 'stream',
      'chat:slowmode': 'stream',
      'chat:subscriber_only': 'stream',
      'vdo:connection': 'stream',
      'vdo:stats': 'stream'
    };

    return mapping[systemType] || 'stream';
  }

  /**
   * Get chat integration statistics
   */
  async getIntegrationStats(streamId: string): Promise<{
    totalSystemMessages: number;
    messagesByType: Record<string, number>;
    lastSystemMessage?: any;
  }> {
    try {
      const messages = await this.prisma.streamMessage.findMany({
        where: {
          streamId,
          type: 'system'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      });

      const messagesByType = messages.reduce((acc, msg) => {
        const type = msg.metadata?.systemType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalSystemMessages: messages.length,
        messagesByType,
        lastSystemMessage: messages[0] || null
      };
    } catch (error) {
      console.error('Error getting integration stats:', error);
      return {
        totalSystemMessages: 0,
        messagesByType: {},
        lastSystemMessage: null
      };
    }
  }
}
