import { z } from 'zod';

/**
 * System message types for stream events and chat integration
 */
export type SystemMessageType = 
  | 'stream:started'
  | 'stream:ended'
  | 'stream:viewer:joined'
  | 'stream:viewer:left'
  | 'stream:quality:changed'
  | 'stream:recording:started'
  | 'stream:recording:stopped'
  | 'stream:product:featured'
  | 'stream:product:added'
  | 'stream:error'
  | 'chat:moderation'
  | 'chat:slowmode'
  | 'chat:subscriber_only'
  | 'vdo:connection'
  | 'vdo:stats';

/**
 * System message data interface
 */
export interface SystemMessageData {
  type: SystemMessageType;
  streamId: string;
  content: string;
  metadata?: {
    username?: string;
    userId?: string;
    viewerCount?: number;
    quality?: string;
    productId?: string;
    productName?: string;
    moderatorId?: string;
    targetUserId?: string;
    action?: string;
    reason?: string;
    duration?: number;
    stats?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * System message templates for different event types
 */
export class SystemMessageGenerator {
  private static readonly MESSAGE_TEMPLATES: Record<SystemMessageType, (data: any) => string> = {
    'stream:started': (data) => `🔴 Stream has started! Welcome everyone!`,
    
    'stream:ended': (data) => `⭕ Stream has ended. Thanks for watching!`,
    
    'stream:viewer:joined': (data) => {
      const { username, viewerCount } = data;
      if (username) {
        return `👋 ${username} joined the stream! (${viewerCount || 1} viewers)`;
      }
      return `👋 A viewer joined the stream! (${viewerCount || 1} viewers)`;
    },
    
    'stream:viewer:left': (data) => {
      const { username, viewerCount } = data;
      if (username) {
        return `👋 ${username} left the stream (${viewerCount || 0} viewers)`;
      }
      return `👋 A viewer left the stream (${viewerCount || 0} viewers)`;
    },
    
    'stream:quality:changed': (data) => {
      const { quality, username } = data;
      if (username) {
        return `📺 ${username} changed stream quality to ${quality || 'auto'}`;
      }
      return `📺 Stream quality changed to ${quality || 'auto'}`;
    },
    
    'stream:recording:started': (data) => `🔴 Recording started`,
    
    'stream:recording:stopped': (data) => `⏹️ Recording stopped`,
    
    'stream:product:featured': (data) => {
      const { productName } = data;
      return `⭐ Now featuring: ${productName || 'a product'}`;
    },
    
    'stream:product:added': (data) => {
      const { productName } = data;
      return `🛒 New product added: ${productName || 'a product'}`;
    },
    
    'stream:error': (data) => {
      const { reason } = data;
      return `⚠️ Stream error: ${reason || 'Unknown error occurred'}`;
    },
    
    'chat:moderation': (data) => {
      const { action, targetUsername, moderatorUsername, reason, duration } = data;
      switch (action) {
        case 'timeout':
          return `⏰ ${targetUsername} was timed out for ${duration || 60} seconds by ${moderatorUsername}${reason ? ` (${reason})` : ''}`;
        case 'ban':
          return `🚫 ${targetUsername} was banned by ${moderatorUsername}${reason ? ` (${reason})` : ''}`;
        case 'unban':
          return `✅ ${targetUsername} was unbanned by ${moderatorUsername}`;
        case 'delete':
          return `🗑️ Message deleted by ${moderatorUsername}`;
        case 'purge':
          return `🧹 Chat cleared by ${moderatorUsername}`;
        default:
          return `🔨 Moderation action by ${moderatorUsername}`;
      }
    },
    
    'chat:slowmode': (data) => {
      const { enabled, delay, moderatorUsername } = data;
      if (enabled) {
        return `🐌 Slow mode enabled (${delay}s) by ${moderatorUsername}`;
      }
      return `🏃 Slow mode disabled by ${moderatorUsername}`;
    },
    
    'chat:subscriber_only': (data) => {
      const { enabled, moderatorUsername } = data;
      if (enabled) {
        return `💎 Subscriber-only mode enabled by ${moderatorUsername}`;
      }
      return `🌍 Subscriber-only mode disabled by ${moderatorUsername}`;
    },
    
    'vdo:connection': (data) => {
      const { status, username } = data;
      switch (status) {
        case 'connected':
          return `🔗 ${username || 'Stream'} connected to VDO.Ninja`;
        case 'disconnected':
          return `🔌 ${username || 'Stream'} disconnected from VDO.Ninja`;
        case 'reconnecting':
          return `🔄 ${username || 'Stream'} reconnecting to VDO.Ninja...`;
        default:
          return `📡 VDO.Ninja status: ${status}`;
      }
    },
    
    'vdo:stats': (data) => {
      const { stats } = data;
      if (stats?.bitrate) {
        return `📊 Stream quality: ${Math.round(stats.bitrate / 1000)}kbps, ${stats.resolution || 'unknown resolution'}`;
      }
      return `📊 Stream stats updated`;
    }
  };

  /**
   * Generate a system message for a given event type and data
   */
  static generateMessage(type: SystemMessageType, data: any = {}): SystemMessageData {
    const template = this.MESSAGE_TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown system message type: ${type}`);
    }

    return {
      type,
      streamId: data.streamId || '',
      content: template(data),
      metadata: data
    };
  }

  /**
   * Generate a custom system message
   */
  static generateCustomMessage(
    streamId: string, 
    content: string, 
    type: SystemMessageType = 'stream:started', 
    metadata?: any
  ): SystemMessageData {
    return {
      type,
      streamId,
      content,
      metadata
    };
  }

  /**
   * Check if a message type should be displayed in chat
   */
  static shouldDisplayInChat(type: SystemMessageType): boolean {
    // Some system messages might be for logging only
    const chatVisibleTypes: SystemMessageType[] = [
      'stream:started',
      'stream:ended',
      'stream:viewer:joined',
      'stream:viewer:left',
      'stream:quality:changed',
      'stream:recording:started',
      'stream:recording:stopped',
      'stream:product:featured',
      'stream:product:added',
      'chat:moderation',
      'chat:slowmode',
      'chat:subscriber_only',
      'vdo:connection'
    ];
    
    return chatVisibleTypes.includes(type);
  }

  /**
   * Get message priority for sorting/display
   */
  static getMessagePriority(type: SystemMessageType): number {
    const priorities: Record<SystemMessageType, number> = {
      'stream:error': 1,
      'chat:moderation': 2,
      'stream:started': 3,
      'stream:ended': 3,
      'stream:recording:started': 4,
      'stream:recording:stopped': 4,
      'chat:slowmode': 5,
      'chat:subscriber_only': 5,
      'stream:product:featured': 6,
      'stream:product:added': 7,
      'stream:quality:changed': 8,
      'vdo:connection': 9,
      'stream:viewer:joined': 10,
      'stream:viewer:left': 10,
      'vdo:stats': 11
    };
    
    return priorities[type] || 10;
  }

  /**
   * Format viewer count for display
   */
  static formatViewerCount(count: number): string {
    if (count === 0) return 'No viewers';
    if (count === 1) return '1 viewer';
    return `${count.toLocaleString()} viewers`;
  }

  /**
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Validation schema for system messages
 */
export const systemMessageSchema = z.object({
  type: z.enum([
    'stream:started',
    'stream:ended',
    'stream:viewer:joined',
    'stream:viewer:left',
    'stream:quality:changed',
    'stream:recording:started',
    'stream:recording:stopped',
    'stream:product:featured',
    'stream:product:added',
    'stream:error',
    'chat:moderation',
    'chat:slowmode',
    'chat:subscriber_only',
    'vdo:connection',
    'vdo:stats'
  ]),
  streamId: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional()
});

export type ValidatedSystemMessage = z.infer<typeof systemMessageSchema>;
