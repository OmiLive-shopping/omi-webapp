import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * Stream lifecycle event types
 */
export type StreamEventType = 
  | 'stream:created'
  | 'stream:updated'
  | 'stream:started'
  | 'stream:ended'
  | 'stream:deleted'
  | 'stream:viewer:joined'
  | 'stream:viewer:left'
  | 'stream:product:featured'
  | 'stream:product:added'
  | 'stream:product:removed'
  | 'stream:chat:message'
  | 'stream:chat:deleted'
  | 'stream:stats:updated'
  | 'stream:quality:changed'
  | 'stream:error';

/**
 * Base event interface
 */
export interface BaseStreamEvent {
  streamId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Stream lifecycle events
 */
export interface StreamCreatedEvent extends BaseStreamEvent {
  type: 'stream:created';
  stream: {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    userId: string;
    user: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
    scheduledFor?: string;
    tags?: string[];
  };
}

export interface StreamUpdatedEvent extends BaseStreamEvent {
  type: 'stream:updated';
  changes: {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    scheduledFor?: string;
    tags?: string[];
  };
  previousValues: Record<string, any>;
  updatedBy: {
    id: string;
    username: string;
  };
}

export interface StreamStartedEvent extends BaseStreamEvent {
  type: 'stream:started';
  stream: {
    id: string;
    title: string;
    userId: string;
    user: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
    vdoRoomId?: string;
    startedAt: string;
  };
}

export interface StreamEndedEvent extends BaseStreamEvent {
  type: 'stream:ended';
  stream: {
    id: string;
    title: string;
    userId: string;
    duration?: number; // in seconds
    endedAt: string;
    finalViewerCount?: number;
    maxViewerCount?: number;
  };
  reason?: 'manual' | 'timeout' | 'error' | 'server_shutdown';
}

export interface StreamDeletedEvent extends BaseStreamEvent {
  type: 'stream:deleted';
  deletedBy: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
  reason?: string;
}

/**
 * Viewer events
 */
export interface ViewerJoinedEvent extends BaseStreamEvent {
  type: 'stream:viewer:joined';
  viewer: {
    id?: string;
    username?: string;
    avatarUrl?: string;
    isAnonymous: boolean;
    socketId: string;
  };
  currentViewerCount: number;
  connectionInfo?: {
    userAgent?: string;
    ipAddress?: string;
    country?: string;
  };
}

export interface ViewerLeftEvent extends BaseStreamEvent {
  type: 'stream:viewer:left';
  viewer: {
    id?: string;
    username?: string;
    socketId: string;
    duration?: number; // how long they watched in seconds
  };
  currentViewerCount: number;
  reason?: 'manual' | 'disconnect' | 'timeout' | 'kicked';
}

/**
 * Product events
 */
export interface ProductFeaturedEvent extends BaseStreamEvent {
  type: 'stream:product:featured';
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    imageUrl?: string;
    description?: string;
  };
  featuredBy: {
    id: string;
    username: string;
  };
  duration?: number; // how long to feature in seconds
  position?: 'overlay' | 'sidebar' | 'banner';
}

export interface ProductAddedEvent extends BaseStreamEvent {
  type: 'stream:product:added';
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    imageUrl?: string;
  };
  addedBy: {
    id: string;
    username: string;
  };
}

export interface ProductRemovedEvent extends BaseStreamEvent {
  type: 'stream:product:removed';
  productId: string;
  removedBy: {
    id: string;
    username: string;
  };
}

/**
 * Chat events
 */
export interface ChatMessageEvent extends BaseStreamEvent {
  type: 'stream:chat:message';
  message: {
    id: string;
    content: string;
    userId?: string;
    username: string;
    avatarUrl?: string;
    role?: string;
    type: 'message' | 'announcement' | 'donation' | 'subscription';
    replyTo?: string;
    reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
  };
}

export interface ChatDeletedEvent extends BaseStreamEvent {
  type: 'stream:chat:deleted';
  messageId: string;
  deletedBy: {
    id: string;
    username: string;
    role: string;
  };
  reason?: string;
}

/**
 * Technical events
 */
export interface StatsUpdatedEvent extends BaseStreamEvent {
  type: 'stream:stats:updated';
  stats: {
    viewerCount: number;
    chatMessageCount?: number;
    bitrate?: number;
    fps?: number;
    resolution?: { width: number; height: number };
    latency?: number;
    packetLoss?: number;
    quality?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
  source: 'vdo_ninja' | 'room_manager' | 'analytics';
}

export interface QualityChangedEvent extends BaseStreamEvent {
  type: 'stream:quality:changed';
  quality: {
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    metrics: {
      bitrate?: number;
      fps?: number;
      latency?: number;
      packetLoss?: number;
    };
    previousLevel?: string;
  };
  automaticAdjustment: boolean;
}

export interface StreamErrorEvent extends BaseStreamEvent {
  type: 'stream:error';
  error: {
    code: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: 'vdo_ninja' | 'socket' | 'database' | 'network';
    stackTrace?: string;
  };
  recovery?: {
    attempted: boolean;
    successful?: boolean;
    action?: string;
  };
}

/**
 * Union type for all stream events
 */
export type StreamEvent = 
  | StreamCreatedEvent
  | StreamUpdatedEvent
  | StreamStartedEvent
  | StreamEndedEvent
  | StreamDeletedEvent
  | ViewerJoinedEvent
  | ViewerLeftEvent
  | ProductFeaturedEvent
  | ProductAddedEvent
  | ProductRemovedEvent
  | ChatMessageEvent
  | ChatDeletedEvent
  | StatsUpdatedEvent
  | QualityChangedEvent
  | StreamErrorEvent;

/**
 * Event listener function type
 */
export type StreamEventListener<T extends StreamEvent = StreamEvent> = (event: T) => void | Promise<void>;

/**
 * Event validation schemas
 */
const baseEventSchema = z.object({
  streamId: z.string().min(1),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatarUrl: z.string().optional(),
});

const streamCreatedSchema = baseEventSchema.extend({
  type: z.literal('stream:created'),
  stream: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    userId: z.string(),
    user: userSchema,
    scheduledFor: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const streamUpdatedSchema = baseEventSchema.extend({
  type: z.literal('stream:updated'),
  changes: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    scheduledFor: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  previousValues: z.record(z.any()),
  updatedBy: userSchema,
});

const viewerJoinedSchema = baseEventSchema.extend({
  type: z.literal('stream:viewer:joined'),
  viewer: z.object({
    id: z.string().optional(),
    username: z.string().optional(),
    avatarUrl: z.string().optional(),
    isAnonymous: z.boolean(),
    socketId: z.string(),
  }),
  currentViewerCount: z.number().min(0),
  connectionInfo: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

/**
 * Centralized Stream Event Emitter
 * Handles all stream lifecycle events with type safety and validation
 */
export class StreamEventEmitter extends EventEmitter {
  private static instance: StreamEventEmitter;
  private eventHistory: Map<string, StreamEvent[]> = new Map(); // Stream ID -> Events
  private maxHistoryPerStream = 100;

  private constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): StreamEventEmitter {
    if (!StreamEventEmitter.instance) {
      StreamEventEmitter.instance = new StreamEventEmitter();
    }
    return StreamEventEmitter.instance;
  }

  /**
   * Emit a stream event with validation
   */
  public async emitStreamEvent<T extends StreamEvent>(event: T): Promise<boolean> {
    try {
      // Validate event based on type
      this.validateEvent(event);

      // Store in history
      this.addToHistory(event);

      // Emit the event
      const result = this.emit(event.type, event);
      this.emit('*', event); // Wildcard for all events

      console.log(`🎬 Stream Event: ${event.type} for stream ${event.streamId}`);

      return result;
    } catch (error) {
      console.error('Failed to emit stream event:', error);
      
      // Emit error event if the original event wasn't an error
      if (event.type !== 'stream:error') {
        const errorEvent: StreamErrorEvent = {
          type: 'stream:error',
          streamId: event.streamId,
          timestamp: new Date().toISOString(),
          error: {
            code: 'EVENT_EMISSION_FAILED',
            message: `Failed to emit ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'medium',
            source: 'socket',
          },
        };
        this.emit('stream:error', errorEvent);
      }

      return false;
    }
  }

  /**
   * Add typed event listener
   */
  public onStreamEvent<T extends StreamEvent>(
    eventType: T['type'] | '*',
    listener: StreamEventListener<T>
  ): this {
    return this.on(eventType, listener);
  }

  /**
   * Add one-time typed event listener
   */
  public onceStreamEvent<T extends StreamEvent>(
    eventType: T['type'] | '*',
    listener: StreamEventListener<T>
  ): this {
    return this.once(eventType, listener);
  }

  /**
   * Remove typed event listener
   */
  public offStreamEvent<T extends StreamEvent>(
    eventType: T['type'] | '*',
    listener: StreamEventListener<T>
  ): this {
    return this.off(eventType, listener);
  }

  /**
   * Get event history for a stream
   */
  public getStreamHistory(streamId: string): StreamEvent[] {
    return this.eventHistory.get(streamId) || [];
  }

  /**
   * Get recent events across all streams
   */
  public getRecentEvents(limit: number = 50): StreamEvent[] {
    const allEvents: StreamEvent[] = [];
    
    for (const events of this.eventHistory.values()) {
      allEvents.push(...events);
    }

    return allEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Clear history for a stream
   */
  public clearStreamHistory(streamId: string): void {
    this.eventHistory.delete(streamId);
  }

  /**
   * Get event statistics
   */
  public getEventStats(): Record<StreamEventType, number> {
    const stats: Partial<Record<StreamEventType, number>> = {};
    
    for (const events of this.eventHistory.values()) {
      for (const event of events) {
        stats[event.type] = (stats[event.type] || 0) + 1;
      }
    }

    return stats as Record<StreamEventType, number>;
  }

  /**
   * Validate event structure
   */
  private validateEvent(event: StreamEvent): void {
    // Basic validation
    if (!event.streamId) {
      throw new Error('Event must have a streamId');
    }

    if (!event.timestamp) {
      throw new Error('Event must have a timestamp');
    }

    if (!event.type) {
      throw new Error('Event must have a type');
    }

    // Type-specific validation
    try {
      switch (event.type) {
        case 'stream:created':
          streamCreatedSchema.parse(event);
          break;
        case 'stream:updated':
          streamUpdatedSchema.parse(event);
          break;
        case 'stream:viewer:joined':
          viewerJoinedSchema.parse(event);
          break;
        // Add more specific validations as needed
        default:
          baseEventSchema.parse(event);
      }
    } catch (validationError) {
      throw new Error(`Event validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: StreamEvent): void {
    if (!this.eventHistory.has(event.streamId)) {
      this.eventHistory.set(event.streamId, []);
    }

    const streamHistory = this.eventHistory.get(event.streamId)!;
    streamHistory.push(event);

    // Trim history if too long
    if (streamHistory.length > this.maxHistoryPerStream) {
      streamHistory.splice(0, streamHistory.length - this.maxHistoryPerStream);
    }
  }

  /**
   * Helper methods for common events
   */

  public async emitStreamCreated(streamData: StreamCreatedEvent['stream']): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:created',
      streamId: streamData.id,
      timestamp: new Date().toISOString(),
      stream: streamData,
    });
  }

  public async emitStreamStarted(streamData: StreamStartedEvent['stream']): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:started',
      streamId: streamData.id,
      timestamp: new Date().toISOString(),
      stream: streamData,
    });
  }

  public async emitStreamEnded(streamId: string, streamData: Omit<StreamEndedEvent['stream'], 'id'>, reason?: StreamEndedEvent['reason']): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:ended',
      streamId,
      timestamp: new Date().toISOString(),
      stream: { id: streamId, ...streamData },
      reason,
    });
  }

  public async emitViewerJoined(streamId: string, viewer: ViewerJoinedEvent['viewer'], currentViewerCount: number): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:viewer:joined',
      streamId,
      timestamp: new Date().toISOString(),
      viewer,
      currentViewerCount,
    });
  }

  public async emitViewerLeft(streamId: string, viewer: ViewerLeftEvent['viewer'], currentViewerCount: number, reason?: ViewerLeftEvent['reason']): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:viewer:left',
      streamId,
      timestamp: new Date().toISOString(),
      viewer,
      currentViewerCount,
      reason,
    });
  }

  public async emitStatsUpdated(streamId: string, stats: StatsUpdatedEvent['stats'], source: StatsUpdatedEvent['source'] = 'room_manager'): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:stats:updated',
      streamId,
      timestamp: new Date().toISOString(),
      stats,
      source,
    });
  }

  public async emitQualityChanged(streamId: string, quality: QualityChangedEvent['quality'], automaticAdjustment = false): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:quality:changed',
      streamId,
      timestamp: new Date().toISOString(),
      quality,
      automaticAdjustment,
    });
  }

  public async emitStreamError(streamId: string, error: StreamErrorEvent['error'], recovery?: StreamErrorEvent['recovery']): Promise<boolean> {
    return this.emitStreamEvent({
      type: 'stream:error',
      streamId,
      timestamp: new Date().toISOString(),
      error,
      recovery,
    });
  }
}

// Export singleton instance
export const streamEventEmitter = StreamEventEmitter.getInstance();
